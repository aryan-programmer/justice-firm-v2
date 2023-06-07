import {
	BatchWriteItemCommand,
	ExecuteStatementCommand,
	PutItemCommand,
	ReturnConsumedCapacity,
	ReturnItemCollectionMetrics,
	ReturnValue,
	UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import _ from "lodash";
import pMap from "p-map";
import {
	CONNECTION_GROUP_ID,
	CONNECTION_ID,
	connectionsByGroupIdIndex,
	GroupIdFromType,
	SETTINGS_GROUP,
	SETTINGS_UNREAD_NOTIFICATIONS
} from "../../../common/infrastructure-constants";
import {NotificationMessageData, UserNotification} from "../../../common/notification-types";
import {nn} from "../../../common/utils/asserts";
import {getExpressionAttributeNames} from "../../../common/utils/functions";
import {prettyPrint} from "../../../common/utils/pretty-print";
import {Nuly} from "../../../common/utils/types";
import {uniqId} from "../../../common/utils/uniq-id";
import {jfNotificationsApiSchema} from "../../../common/ws-notifications-api-schema";
import {eventsSender} from "../../../singularity/websocket/ws-model.server";
import {connectionsTableName, dynamoDbClient, messagesTableName, ssmClient,} from "../../common/environment-clients";
import {RedisCacheModel} from "../../common/redis-cache-model";
import {dateToDynamoDbStr} from "../../common/utils/date-to-str";
import {printConsumedCapacity, repeatedQuestionMarks} from "../../common/utils/functions";
import {notificationToDynamoDbRecord} from "./notifications-transformer";

export const WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME = nn(process.env.WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME);
export const settingsTableName                            = nn(process.env.SETTINGS_TABLE_NAME);
export const HASH_SETTINGS_UNREAD_NOTIFICATIONS           = `#${SETTINGS_UNREAD_NOTIFICATIONS}`;
export const EAN_SETTINGS_UNREAD_NOTIFICATIONS            = getExpressionAttributeNames([SETTINGS_UNREAD_NOTIFICATIONS]);

export function extractUnreadNotifications (item: Record<string, AttributeValue> | Nuly) {
	const res = item?.[SETTINGS_UNREAD_NOTIFICATIONS]?.SS;
	return res == null ? [] : [...res];
}

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

		const numOpenConnections = await this.common.sendToGroup(groupId,
			(conn) => this.on.notification(notifData, conn));
		prettyPrint({groupId, numOpenConnections, notifData});
		if (numOpenConnections === 0) {
			await WsNotificationsHelper.markAsUnread_NoSend(groupId, [notifData.id]);
		}
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

		const uniqueGroupIds = _
			.chain(notifications)
			.map(value => (+value.userId))
			.filter(value => !Number.isNaN(value))
			.uniq()
			.map(value => GroupIdFromType.UserNotifications(value.toString()))
			.value();

		const uniqueGroupIdRecords = uniqueGroupIds
			.map(value => ({S: value}) as AttributeValue);

		const statement =
			      `SELECT "${CONNECTION_GROUP_ID}", "${CONNECTION_ID}"
			       FROM "${connectionsTableName}"."${connectionsByGroupIdIndex}"
			       WHERE "${CONNECTION_GROUP_ID}" IN [${repeatedQuestionMarks(uniqueGroupIdRecords.length)}]`;

		prettyPrint({statement, uniqueUserIds: uniqueGroupIds});
		const queryResponse = await dynamoDbClient.send(new ExecuteStatementCommand({
			Statement:              statement,
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
			Parameters:             uniqueGroupIdRecords
		}));
		printConsumedCapacity("sendNotifications: Connections", queryResponse);
		const connectionWithGroupIds = queryResponse.Items ?? [];
		prettyPrint(connectionWithGroupIds);
		const connsByGroupId = {} as Record<string, string[] | undefined>;

		const laterQueue = [] as Promise<void>[];

		for (const connectionWithGroupId of connectionWithGroupIds) {
			const groupId = connectionWithGroupId[CONNECTION_GROUP_ID]?.S;
			const conn    = connectionWithGroupId[CONNECTION_ID]?.S;
			if (conn == null) continue;
			if (groupId == null) {
				laterQueue.push(this.common.deleteConnection(conn));
				continue;
			}
			(connsByGroupId[groupId] ??= []).push(conn);
		}
		if (laterQueue.length > 0) {
			await Promise.all(laterQueue);
		}
		await pMap(uniqueGroupIds, async groupId => {
			const notifications = notificationsByGroupId[groupId];
			const conns         = connsByGroupId[groupId];
			if (notifications == null || notifications.length === 0) return;
			if (notifications.length > 1) {
				notifications.sort((a, b) => {
					return (+a.timestamp) - (+b.timestamp);
				});
			}
			const numOpenConnections = conns == null ? 0 : await this.common.onAllConnections(conns, async conn => {
				for (const notification of notifications) {
					await this.on.notification(notification, conn);
				}
			});
			prettyPrint({groupId, numOpenConnections, notifications});
			if (numOpenConnections === 0) {
				await WsNotificationsHelper.markAsUnread_NoSend(groupId, notifications.map(value => value.id));
			}
		})
	}

	public static async markAsUnread_NoSend (groupId: string, notificationIds: string[]) {
		const markAsUnreadCommandOutput = await dynamoDbClient.send(new UpdateItemCommand({
			TableName:                 settingsTableName,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES,
			UpdateExpression:          `ADD #${SETTINGS_UNREAD_NOTIFICATIONS} :newUnreadNotifications`,
			ExpressionAttributeNames:  EAN_SETTINGS_UNREAD_NOTIFICATIONS,
			Key:                       {
				[SETTINGS_GROUP]: {S: groupId},
			},
			ExpressionAttributeValues: {
				':newUnreadNotifications': {SS: notificationIds},
			},
			ReturnValues:              ReturnValue.ALL_NEW,
		}));
		printConsumedCapacity("updateRowDeleteItemFromSet", markAsUnreadCommandOutput);
		prettyPrint("updateRowDeleteItemFromSet: ", markAsUnreadCommandOutput);
		return extractUnreadNotifications(markAsUnreadCommandOutput.Attributes);
	}
}
