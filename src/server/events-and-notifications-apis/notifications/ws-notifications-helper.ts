import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {
	BatchWriteItemCommand,
	ExecuteStatementCommand,
	PutItemCommand,
	QueryCommand,
	ReturnConsumedCapacity,
	ReturnItemCollectionMetrics,
	Select
} from "@aws-sdk/client-dynamodb";
import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import _ from "lodash";
import pMap from "p-map";
import {
	CONNECTION_GROUP_ID,
	CONNECTION_ID,
	connectionsByGroupIdIndex,
	ConnectionsTable_ExpressionAttributeNames,
	GroupIdFromType
} from "../../../common/infrastructure-constants";
import {NotificationMessageData, UserNotification} from "../../../common/notification-types";
import {filterMap} from "../../../common/utils/array-methods/filterMap";
import {nn} from "../../../common/utils/asserts";
import {prettyPrint} from "../../../common/utils/pretty-print";
import {uniqId} from "../../../common/utils/uniq-id";
import {jfNotificationsApiSchema} from "../../../common/ws-notifications-api-schema";
import {eventsSender} from "../../../singularity/websocket/ws-model.server";
import {connectionsTableName, dynamoDbClient, messagesTableName, ssmClient,} from "../../common/environment-clients";
import {RedisCacheModel} from "../../common/redis-cache-model";
import {dateToDynamoDbStr} from "../../common/utils/date-to-str";
import {printConsumedCapacity, repeatedQuestionMarks} from "../../common/utils/functions";
import {notificationToDynamoDbRecord} from "./notifications-transformer";

export const WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME = nn(process.env.WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME);

let fakeOn = true ? undefined as never : eventsSender(jfNotificationsApiSchema,
	{validateEventsBody: true, endpoint: ""});

export type WsNotificationEventDispatcher = typeof fakeOn;

export type BatchSendNotif_T = {
	userId: string,
	sendingTimestamp: Date,
	notification: UserNotification
}

export class WsNotificationsHelper {
	on: WsNotificationEventDispatcher;

	constructor (protected common: RedisCacheModel) {
		this.setup().catch(ex => console.trace(ex));
	}

	async setup () {
		if (this.on != null) return;
		const endpoint = nn((await ssmClient.send(new GetParameterCommand({
			Name:           WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME,
			WithDecryption: true
		}))).Parameter?.Value);
		this.on        = eventsSender(jfNotificationsApiSchema, {validateEventsBody: true, endpoint});
	}

	async sendNotification (
		userId: string,
		sendingTimestamp: Date,
		notification: UserNotification
	) {
		await this.setup();

		const groupId                            = GroupIdFromType.UserNotifications(userId);
		const notifData: NotificationMessageData = {
			notification,
			groupId,
			id:        uniqId(),
			timestamp: dateToDynamoDbStr(sendingTimestamp)
		};

		console.log("Sending notification: ", notifData);

		const item = notificationToDynamoDbRecord(notifData);

		const putNotifResponse = await dynamoDbClient.send(new PutItemCommand({
			TableName:              messagesTableName,
			Item:                   item,
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("sendNotification: ", putNotifResponse);

		const queryResponse = await dynamoDbClient.send(new QueryCommand({
			TableName:                 connectionsTableName,
			IndexName:                 connectionsByGroupIdIndex,
			ProjectionExpression:      `#${CONNECTION_ID}`,
			KeyConditionExpression:    `#${CONNECTION_GROUP_ID} = :needGroupId`,
			ExpressionAttributeNames:  ConnectionsTable_ExpressionAttributeNames,
			ExpressionAttributeValues: {
				":needGroupId": {S: groupId},
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("sendNotification: Connections", queryResponse);
		const conns = filterMap(queryResponse.Items, value => value?.[CONNECTION_ID]?.S?.toString());
		await this.common.onAllConnections(conns, (conn) => this.on.notification(notifData, conn));
	}

	async sendNotifications (notifications: BatchSendNotif_T[]) {
		await this.setup();

		const notificationMessages   = notifications.map(({userId, sendingTimestamp, notification}) => {
			const groupId                            = GroupIdFromType.UserNotifications(userId);
			const notifData: NotificationMessageData = {
				notification,
				groupId,
				id:        uniqId(),
				timestamp: dateToDynamoDbStr(sendingTimestamp)
			};
			return notifData;
		});
		const notificationsByGroupId = _.groupBy(notificationMessages, value => value.groupId);

		prettyPrint("Sending notifications: ", {notificationMessages, notificationsByGroupId});

		const batchWriteOutput = await dynamoDbClient.send(new BatchWriteItemCommand({
			RequestItems:                {
				[messagesTableName]: notificationMessages.map(value => ({
					PutRequest: {
						Item: notificationToDynamoDbRecord(value)
					}
				}))
			},
			ReturnConsumedCapacity:      ReturnConsumedCapacity.INDEXES,
			ReturnItemCollectionMetrics: ReturnItemCollectionMetrics.SIZE,
		}));
		prettyPrint(`Consumed Capacity for sendNotifications BatchWriteItemCommand: `,
			batchWriteOutput.ConsumedCapacity);
		prettyPrint(`Item Collection Metrics for sendNotifications BatchWriteItemCommand: `,
			batchWriteOutput.ItemCollectionMetrics);

		const uniqueUserIds = _
			.chain(notifications)
			.map(value => (+value.userId))
			.filter(value => !Number.isNaN(value))
			.uniq()
			.map(value => ({S: GroupIdFromType.UserNotifications(value.toString())}) as AttributeValue)
			.value();

		const statement =
			      `SELECT "${CONNECTION_GROUP_ID}", "${CONNECTION_ID}"
			       FROM "${connectionsTableName}"."${connectionsByGroupIdIndex}"
			       WHERE "${CONNECTION_GROUP_ID}" IN [${repeatedQuestionMarks(uniqueUserIds.length)}]`;

		prettyPrint({statement, uniqueUserIds});
		const queryResponse = await dynamoDbClient.send(new ExecuteStatementCommand({
			Statement:              statement,
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
			Parameters:             uniqueUserIds
		}));
		printConsumedCapacity("sendNotifications: Connections", queryResponse);
		const items = queryResponse.Items;
		prettyPrint(items);
		if (items == null || items.length === 0) return;
		await pMap(items, async item => {
			const groupId = item[CONNECTION_GROUP_ID]?.S;
			const conn    = item[CONNECTION_ID]?.S;
			if (conn == null) return;
			if (groupId == null) {
				await this.common.deleteConnection(conn);
				return;
			}
			const notifications = notificationsByGroupId[groupId];
			if (notifications == null || notifications.length === 0) return;
			if (notifications.length > 1) {
				notifications.sort((a, b) => {
					return (+a.timestamp) - (+b.timestamp);
				});
			}
			try {
				for (const notification of notifications) {
					await this.on.notification(notification, conn);
				}
			} catch (ex) {
				if (ex instanceof GoneException) {
					console.log({GoneException: ex});
					await this.common.deleteConnection(conn);
				} else {
					console.log({ex});
				}
			}
		});
	}
}
