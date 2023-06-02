import {
	PutItemCommand,
	QueryCommand,
	QueryCommandOutput,
	ReturnConsumedCapacity,
	Select
} from "@aws-sdk/client-dynamodb";
import {APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {PrivateAuthToken} from "../../../common/api-types";
import {CONNECTION_GROUP_ID, CONNECTION_ID, GroupIdFromType} from "../../../common/infrastructure-constants";
import {NotificationMessageData} from "../../../common/notification-types";
import {Nuly} from "../../../common/utils/types";
import {
	EstablishNotificationsConnectionInput,
	GetNotificationsInput,
	jfNotificationsApiSchema
} from "../../../common/ws-notifications-api-schema";
import {EndpointResult} from "../../../singularity/endpoint";
import {Message, noContent, response} from "../../../singularity/helpers";
import {WSAPIImplementation, WSEndpointResult, WSFnParams} from "../../../singularity/websocket/ws-endpoint";
import {connectionsTableName, dynamoDbClient, messagesTableName} from "../../common/environment-clients";
import {printConsumedCapacity, verifyAndDecodeJwtToken} from "../../common/utils/functions";
import {
	dynamoDbRecordToNotification,
	GetNotifications_EAV_CNeedGroup,
	GetNotifications_ExpressionAttributeNames,
	GetNotifications_KeyConditionExpression,
	GetNotifications_ProjectionExpression
} from "./notifications-transformer";
import {WsNotificationsHelper} from "./ws-notifications-helper";

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
		Promise<EndpointResult<Message | NotificationMessageData[]>> {
		const jwtSecret             = await this.common.getJwtSecret();
		const jwt: PrivateAuthToken = await verifyAuthJwtToken(params.body.authToken.jwt, jwtSecret);
		const {id}                  = jwt;

		const groupId                           = GroupIdFromType.UserNotifications(id);
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
		// prettyPrint("getNotifications: ", jwt, queryResponse);

		if (queryResponse.Items == null || queryResponse.Items.length === 0)
			return response(200, []);
		return response(200, queryResponse.Items.map(value => dynamoDbRecordToNotification(groupId, value)));
	}
}
