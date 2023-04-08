import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {
	ConsumedCapacity,
	DeleteItemCommand,
	PutItemCommand,
	QueryCommand,
	QueryCommandOutput,
	ReturnConsumedCapacity,
	Select
} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {sign} from "jsonwebtoken";
import {PrivateAuthToken} from "../common/api-types";
import {UserAccessType} from "../common/db-types";
import {nn} from "../common/utils/asserts";
import {Nuly} from "../common/utils/types";
import {uniqId} from "../common/utils/uniq-id";
import {
	ChatAuthToken,
	ChatGroupData,
	EstablishConnectionInput,
	EstablishConnectionOutput,
	GetMessagesInput,
	jfChatterBoxApiSchema,
	MessageData,
	PostMessageInput,
	PrivateChatAuthToken
} from "../common/ws-api-schema";
import {connectionsByGroupIndex} from "../infrastructure/constants";
import {constants} from "../singularity/constants";
import {EndpointResult} from "../singularity/endpoint";
import {message, Message, noContent, response} from "../singularity/helpers";
import {WSAPIImplementation, WSEndpointResult, WSFnParams} from "../singularity/websocket/ws-endpoint";
import {eventsSender} from "../singularity/websocket/ws-model.server";
import {connectionsTableName, dynamoDbClient, messagesTableName, ssmClient} from "./environment-clients";
import {JusticeFirmRestAPIImpl} from "./rest-api-impl";
import {printConsumedCapacity, verifyAndDecodeJwtToken} from "./utils/functions";

function generateChatAuthToken (
	user: string,
	group: string,
	jwtSecret: string,
): ChatAuthToken {
	const privateToken: PrivateChatAuthToken = {
		user,
		group
	};
	return {
		...privateToken,
		jwt: sign(privateToken, jwtSecret)
	};
}

const verifyAuthJwtToken = verifyAndDecodeJwtToken<PrivateAuthToken>;
const verifyChatJwtToken = verifyAndDecodeJwtToken<PrivateChatAuthToken>;

let fakeOn = true ? undefined as never : eventsSender(jfChatterBoxApiSchema, {validateEventsBody: true, endpoint: ""});

export class JusticeFirmWsRestAPIImpl
	extends JusticeFirmRestAPIImpl
	implements WSAPIImplementation<typeof jfChatterBoxApiSchema> {
	on: typeof fakeOn;

	constructor () {
		super();
		this.setup().catch(ex => console.log(ex));
	}

	async setup () {
		if (this.on != null) return
		const endpoint = nn((await ssmClient.send(new GetParameterCommand({
			Name:           process.env.WS_API_CALLBACK_URL_PARAM,
			WithDecryption: true
		}))).Parameter?.Value)
		this.on        = eventsSender(jfChatterBoxApiSchema, {validateEventsBody: true, endpoint});
	}

	async $connect (params: WSFnParams<Nuly>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		await this.setup();
		return noContent;
	}

	async establishConnection (params: WSFnParams<EstablishConnectionInput>, event: APIGatewayProxyWebsocketEventV2)
		: Promise<WSEndpointResult<EstablishConnectionOutput | Message>> {
		const {authToken, group}    = params.body;
		const jwtSecret             = await this.getJwtSecret();
		const jwt: PrivateAuthToken = await verifyAuthJwtToken(authToken.jwt, jwtSecret);
		if (jwt.userType !== UserAccessType.Lawyer && jwt.userType !== UserAccessType.Client) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Must be a lawyer or client");
		}
		const resSet = await (await this.getPool()).execute(
			`
				SELECT g.name      AS g_name,
				       g.case_id   AS case_id,
				       g.client_id AS c_id,
				       c.name      AS c_name,
				       g.lawyer_id AS l_id,
				       l.name      AS l_name
				FROM \`group\` g
				JOIN user      c ON c.id = g.client_id
				JOIN user      l ON l.id = g.lawyer_id
				WHERE g.id = ?`,
			[group]);
		if (resSet.length === 0) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, `No group with id ${group} exists`);
		}
		const res                      = resSet[0];
		const groupData: ChatGroupData = {
			name:   res.g_name.toString(),
			caseId: res.case_id?.toString(),
			client: {
				id:   res.c_id.toString(),
				name: res.c_name.toString(),
			},
			lawyer: {
				id:   res.l_id.toString(),
				name: res.l_name.toString(),
			},
		};
		if (groupData.lawyer.id !== jwt.id && groupData.client.id !== jwt.id) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				`User ${jwt.id} is not authorized to access the chat group ${group}`);
		}
		const conn        = event.requestContext.connectionId;
		const putResponse            = await dynamoDbClient.send(new PutItemCommand({
			TableName:              connectionsTableName,
			Item:                   {
				group: {S: group},
				conn:  {S: conn}
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("establishConnection", putResponse)
		return response(200, {
			...groupData,
			chatAuthToken: generateChatAuthToken(jwt.id, group, jwtSecret)
		});
	}

	async $disconnect (params: WSFnParams<Nuly>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		await this.deleteConnection(event.requestContext.connectionId);
		return noContent;
	}

	private async deleteConnection (conn: string) {
		const deleteResponse = await dynamoDbClient.send(new DeleteItemCommand({
			TableName:              connectionsTableName,
			Key:                    {
				conn: {S: conn}
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("deleteConnection", deleteResponse);
	}

	async postMessage (params: WSFnParams<PostMessageInput>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		const {chatAuthToken, text}     = params.body;
		const jwtSecret                 = await this.getJwtSecret();
		const jwt: PrivateChatAuthToken = await verifyChatJwtToken(chatAuthToken.jwt, jwtSecret);
		const {group, user}             = jwt;
		const now                       = Date.now();
		const messageData: MessageData  = {
			group: group,
			ts:    now.toString(10),
			text,
			from:  user,
			id:    uniqId(),
		};
		const putMessageResponse        = await dynamoDbClient.send(new PutItemCommand({
			TableName:              messagesTableName,
			Item:                   {
				group: {S: messageData.group},
				ts:    {S: messageData.ts},
				text:  {S: messageData.text},
				from:  {S: messageData.from},
				id:    {S: messageData.id},
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("postMessage: message", putMessageResponse);

		const queryResponse = await dynamoDbClient.send(new QueryCommand({
			TableName:                 connectionsTableName,
			IndexName:                 connectionsByGroupIndex,
			ProjectionExpression:      "#conn",
			KeyConditionExpression:    "#group = :needGroup",
			ExpressionAttributeNames:  {
				"#group": "group",
				"#conn":  "conn",
			},
			ExpressionAttributeValues: {
				":needGroup": {S: group}
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("postMessage: Connections", queryResponse);
		if (queryResponse.Items == null || queryResponse.Items.length === 0)
			return message(200, "Message sent. No active connections");
		await Promise.all(queryResponse.Items.map(async value => {
			const conn = value.conn;
			if (!("S" in conn) || conn.S == null) return;
			try {
				await this.on.incomingMessage(messageData, conn.S);
			} catch (ex) {
				if (ex instanceof GoneException) {
					console.log({GoneException: ex});
					await this.deleteConnection(conn.S);
				} else {
					console.log({ex});
				}
			}
		}));
		return message(200, "Message sent");
	}

	async getMessages (params: WSFnParams<GetMessagesInput>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Message | MessageData[]>> {
		const jwtSecret                 = await this.getJwtSecret();
		const jwt: PrivateChatAuthToken = await verifyChatJwtToken(params.body.chatAuthToken.jwt, jwtSecret);
		const {group, user}             = jwt;

		const queryResponse: QueryCommandOutput = await dynamoDbClient.send(new QueryCommand({
			TableName:                 messagesTableName,
			ProjectionExpression:      "#ts,#text,#from,#id",
			KeyConditionExpression:    "#group = :needGroup",
			ExpressionAttributeNames:  {
				"#group": "group",
				"#ts":    "ts",
				"#text":  "text",
				"#from":  "from",
				"#id":    "id",
			},
			ExpressionAttributeValues: {
				":needGroup": {S: group}
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));

		printConsumedCapacity("getMessages", queryResponse);

		if (queryResponse.Items == null || queryResponse.Items.length === 0)
			return response(200, []);
		console.log(queryResponse.Items);
		return response(200, queryResponse.Items.map(value => ({
			group: group,
			ts:    value.ts.S,
			text:  value.text.S,
			from:  value.from.S,
			id:    value.id.S,
		} as MessageData)));
	}
}
