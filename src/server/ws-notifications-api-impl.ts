import {PutItemCommand, QueryCommand, ReturnConsumedCapacity, Select} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {PrivateAuthToken} from "../common/api-types";
import {
	CONNECTION_ID,
	CONNECTION_KEY_ID,
	CONNECTION_TYPE,
	connectionsByKeyIdIndex,
	ConnectionTypeOptions
} from "../common/infrastructure-constants";
import {filterMap} from "../common/utils/array-methods/filterMap";
import {nn} from "../common/utils/asserts";
import {Nuly} from "../common/utils/types";
import {EstablishNotificationsConnectionInput, jfNotificationsApiSchema} from "../common/ws-notifications-api-schema";
import {EndpointResult} from "../singularity/endpoint";
import {message, Message, noContent} from "../singularity/helpers";
import {WSAPIImplementation, WSEndpointResult, WSFnParams} from "../singularity/websocket/ws-endpoint";
import {eventsSender} from "../singularity/websocket/ws-model.server";
import {CommonApiMethods} from "./common-api-methods";
import {
	connectionsTableName,
	dynamoDbClient,
	ssmClient,
	WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME
} from "./environment-clients";
import {printConsumedCapacity, verifyAndDecodeJwtToken} from "./utils/functions";
import {FileUploadData} from "./utils/types";

const verifyAuthJwtToken = verifyAndDecodeJwtToken<PrivateAuthToken>;
const verifyFileJwtToken = verifyAndDecodeJwtToken<FileUploadData>;

const ConnectionsTable_ExpressionAttributeNames = [
	CONNECTION_ID,
	CONNECTION_TYPE,
	CONNECTION_KEY_ID
].reduce((prev, curr) => {
	prev["#" + curr] = curr;
	return prev;
}, {} as Record<string, string>);

let fakeOn = true ? undefined as never : eventsSender(jfNotificationsApiSchema,
	{validateEventsBody: true, endpoint: ""});

export class JusticeFirmWsNotificationsAPIImpl
	implements WSAPIImplementation<typeof jfNotificationsApiSchema> {
	on: typeof fakeOn;

	constructor (private common: CommonApiMethods) {
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
				[CONNECTION_KEY_ID]: {S: jwt.id},
				[CONNECTION_ID]:     {S: conn},
				[CONNECTION_TYPE]:   {S: ConnectionTypeOptions.UserNotificationConnection},
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("establishConnection", putResponse)
		return noContent;
	}

	async $disconnect (params: WSFnParams<Nuly>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		await this.common.deleteConnection(event.requestContext.connectionId);
		return noContent;
	}

	async notify (userId: string, notification: Notification) {
		const queryResponse = await dynamoDbClient.send(new QueryCommand({
			TableName:                 connectionsTableName,
			IndexName:                 connectionsByKeyIdIndex,
			ProjectionExpression:      `#${CONNECTION_ID}`,
			KeyConditionExpression:    `#${CONNECTION_KEY_ID} = :needUserId AND #${CONNECTION_TYPE} = :needConnType`,
			ExpressionAttributeNames:  ConnectionsTable_ExpressionAttributeNames,
			ExpressionAttributeValues: {
				":needUserId":   {S: userId},
				":needConnType": {S: ConnectionTypeOptions.UserNotificationConnection}
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("postMessage: Connections", queryResponse);
		const conns = filterMap(queryResponse.Items, value => value?.[CONNECTION_ID]?.S?.toString());
		await this.common.onAllConnections(conns, async conn => this.on.notification(notification, conn));
		return message(200, "Message sent");
	}
}
