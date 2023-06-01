import {PutItemCommand, QueryCommand, ReturnConsumedCapacity, Select} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
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
import {uniqId} from "../../../common/utils/uniq-id";
import {jfNotificationsApiSchema} from "../../../common/ws-notifications-api-schema";
import {eventsSender} from "../../../singularity/websocket/ws-model.server";
import {
	connectionsTableName,
	dynamoDbClient, messagesTableName,
	ssmClient,
} from "../../common/environment-clients";
import {RedisCacheModel} from "../../common/redis-cache-model";
import {dateToDynamoDbStr} from "../../common/utils/date-to-str";
import {printConsumedCapacity} from "../../common/utils/functions";
import {notificationToDynamoDbRecord} from "./notifications-transformer";

export const WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME = nn(process.env.WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME);

let fakeOn = true ? undefined as never : eventsSender(jfNotificationsApiSchema,
	{validateEventsBody: true, endpoint: ""});

export type WsNotificationEventDispatcher = typeof fakeOn;

export class WsNotificationsHelper {
	on: WsNotificationEventDispatcher;

	constructor (protected common: RedisCacheModel) {
		this.setup().catch(ex => console.trace(ex));
	}

	async setup () {
		if (this.on != null) return
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

		const groupId = GroupIdFromType.UserNotifications(userId);
		const notifData: NotificationMessageData = {
			notification,
			groupId,
			id: uniqId(),
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
		printConsumedCapacity("postMessage: Connections", queryResponse);
		const conns = filterMap(queryResponse.Items, value => value?.[CONNECTION_ID]?.S?.toString());
		await this.common.onAllConnections(conns, (conn) => this.on.notification(notifData, conn));
	}
}
