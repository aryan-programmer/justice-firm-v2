import {
	GetItemCommand,
	GetItemOutput,
	PutItemCommand,
	QueryCommand,
	QueryCommandOutput,
	ReturnConsumedCapacity,
	ReturnValue,
	Select,
	UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import {APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {PrivateAuthToken} from "~~/src/common/api-types";
import {
	CONNECTION_GROUP_ID,
	CONNECTION_ID,
	GroupIdFromType,
	SETTINGS_GROUP,
	SETTINGS_UNREAD_NOTIFICATIONS
} from "~~/src/common/infrastructure-constants";
import {prettyPrint} from "~~/src/common/utils/pretty-print";
import {Nuly} from "~~/src/common/utils/types";
import {
	EstablishNotificationsConnectionInput,
	GetNotificationsInput,
	GetNotificationsOutput,
	jfNotificationsApiSchema,
	MarkAllAsReadInput,
	SetIsReadStatusInput
} from "~~/src/common/ws-notifications-api-schema";
import {EndpointResult} from "~~/src/singularity/endpoint";
import {Message, noContent, response} from "~~/src/singularity/helpers";
import {WSAPIImplementation, WSEndpointResult, WSFnParams} from "~~/src/singularity/websocket/ws-endpoint";
import {connectionsTableName, dynamoDbClient, messagesTableName} from "../../common/environment-clients";
import {printConsumedCapacity, verifyAndDecodeJwtToken} from "../../common/utils/functions";
import {
	dynamoDbRecordToNotification,
	GetNotifications_EAV_CNeedGroup,
	GetNotifications_ExpressionAttributeNames,
	GetNotifications_KeyConditionExpression,
	GetNotifications_ProjectionExpression
} from "./notifications-transformer";
import {
	EAN_SETTINGS_UNREAD_NOTIFICATIONS,
	extractUnreadNotifications,
	HASH_SETTINGS_UNREAD_NOTIFICATIONS,
	settingsTableName,
	WsNotificationsHelper
} from "./ws-notifications-helper";

const verifyAuthJwtToken = verifyAndDecodeJwtToken<PrivateAuthToken>;

export class JusticeFirmWsNotificationsAPIImpl
	extends WsNotificationsHelper
	implements WSAPIImplementation<typeof jfNotificationsApiSchema> {

	async $connect (params: WSFnParams<Nuly>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		await this.setup();
		return noContent;
	}

	async establishConnection (params: WSFnParams<EstablishNotificationsConnectionInput>, event: APIGatewayProxyWebsocketEventV2)
		: Promise<WSEndpointResult<Nuly | Message>> {
		const {authToken}           = params.body;
		const jwtSecret             = await this.common.getJwtSecret();
		const jwt: PrivateAuthToken = await verifyAuthJwtToken(authToken.jwt, jwtSecret);
		const conn                  = event.requestContext.connectionId;
		const putResponse           = await dynamoDbClient.send(new PutItemCommand({
			TableName:              connectionsTableName,
			Item:                   {
				[CONNECTION_GROUP_ID]: {S: GroupIdFromType.UserNotifications(jwt.id)},
				[CONNECTION_ID]:       {S: conn},
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("establishConnection", putResponse);
		return noContent;
	}

	async $disconnect (params: WSFnParams<Nuly>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		await this.common.deleteConnection(event.requestContext.connectionId);
		return noContent;
	}

	async getNotifications (params: WSFnParams<GetNotificationsInput>):
		Promise<EndpointResult<Message | GetNotificationsOutput>> {
		const jwtSecret                         = await this.common.getJwtSecret();
		const jwt: PrivateAuthToken             = await verifyAuthJwtToken(params.body.authToken.jwt, jwtSecret);
		const groupId                           = GroupIdFromType.UserNotifications(jwt.id);
		const queryResponse: QueryCommandOutput = await dynamoDbClient.send(new QueryCommand({
			TableName:                 messagesTableName,
			ProjectionExpression:      GetNotifications_ProjectionExpression,
			KeyConditionExpression:    GetNotifications_KeyConditionExpression,
			ExpressionAttributeNames:  GetNotifications_ExpressionAttributeNames,
			ExpressionAttributeValues: {
				[GetNotifications_EAV_CNeedGroup]: {S: groupId}
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));

		printConsumedCapacity("getNotifications", queryResponse);

		if (queryResponse.Items == null || queryResponse.Items.length === 0)
			return response(200, {notifications: [], unreadNotifications: []});
		const notifications = queryResponse.Items.map(value => dynamoDbRecordToNotification(groupId, value));

		const getUnreadNotifications: GetItemOutput = await dynamoDbClient.send(new GetItemCommand({
			TableName:                settingsTableName,
			ReturnConsumedCapacity:   ReturnConsumedCapacity.INDEXES,
			ExpressionAttributeNames: EAN_SETTINGS_UNREAD_NOTIFICATIONS,
			ProjectionExpression:     HASH_SETTINGS_UNREAD_NOTIFICATIONS,
			Key:                      {
				[SETTINGS_GROUP]: {S: groupId},
			},
		}));
		printConsumedCapacity("getUnreadNotifications", getUnreadNotifications);
		return response(200, {
			notifications,
			unreadNotifications: extractUnreadNotifications(getUnreadNotifications.Item),
		});
	}

	async setIsReadStatus (params: WSFnParams<SetIsReadStatusInput>): Promise<EndpointResult<Message | Nuly>> {
		const {isRead, notificationId} = params.body;
		const jwtSecret                = await this.common.getJwtSecret();
		const jwt: PrivateAuthToken    = await verifyAuthJwtToken(params.body.authToken.jwt, jwtSecret);
		const groupId                  = GroupIdFromType.UserNotifications(jwt.id);
		let unreadNotifications: string[];
		if (isRead) {
			const markAsReadCommandOutput = await dynamoDbClient.send(new UpdateItemCommand({
				TableName:                 settingsTableName,
				ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES,
				UpdateExpression:          `DELETE #${SETTINGS_UNREAD_NOTIFICATIONS} :newlyReadNotifications`,
				ExpressionAttributeNames:  EAN_SETTINGS_UNREAD_NOTIFICATIONS,
				Key:                       {
					[SETTINGS_GROUP]: {S: groupId},
				},
				ExpressionAttributeValues: {
					':newlyReadNotifications': {SS: [notificationId]},
				},
				ReturnValues:              ReturnValue.ALL_NEW,
			}));
			printConsumedCapacity("updateRowDeleteItemFromSet", markAsReadCommandOutput);
			prettyPrint("updateRowDeleteItemFromSet: ", markAsReadCommandOutput);
			unreadNotifications = extractUnreadNotifications(markAsReadCommandOutput.Attributes);
		} else {
			unreadNotifications = await WsNotificationsHelper.markAsUnread_NoSend(groupId, [notificationId]);
		}
		await this.common.sendToGroup(groupId, conn => this.on.unreadNotifications(unreadNotifications, conn));

		return noContent;
	}

	async markAllAsRead (params: WSFnParams<MarkAllAsReadInput>): Promise<EndpointResult<Message | Nuly>> {
		const jwtSecret                  = await this.common.getJwtSecret();
		const jwt: PrivateAuthToken      = await verifyAuthJwtToken(params.body.authToken.jwt, jwtSecret);
		const groupId                    = GroupIdFromType.UserNotifications(jwt.id);
		const markAllAsReadCommandOutput = await dynamoDbClient.send(new UpdateItemCommand({
			TableName:                settingsTableName,
			ReturnConsumedCapacity:   ReturnConsumedCapacity.INDEXES,
			UpdateExpression:         `REMOVE #${SETTINGS_UNREAD_NOTIFICATIONS}`,
			ExpressionAttributeNames: EAN_SETTINGS_UNREAD_NOTIFICATIONS,
			Key:                      {
				[SETTINGS_GROUP]: {S: groupId},
			},
			ReturnValues:             ReturnValue.ALL_NEW,
		}));
		printConsumedCapacity("updateRowDeleteItemFromSet", markAllAsReadCommandOutput);
		prettyPrint("updateRowDeleteItemFromSet: ", markAllAsReadCommandOutput);
		await this.common.sendToGroup(groupId, conn => this.on.unreadNotifications([], conn));

		return noContent;
	}
}
