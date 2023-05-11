import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {
	DeleteItemCommand,
	PutItemCommand,
	QueryCommand,
	QueryCommandOutput,
	ReturnConsumedCapacity,
	Select
} from "@aws-sdk/client-dynamodb";
import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {sign} from "jsonwebtoken";
import {PrivateAuthToken} from "../common/api-types";
import {UserAccessType} from "../common/db-types";
import {nn} from "../common/utils/asserts";
import {isNullOrEmpty} from "../common/utils/functions";
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
	PostMessageWithAttachmentInput,
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
import {printConsumedCapacity, shortenS3Url, unShortenS3Url, verifyAndDecodeJwtToken} from "./utils/functions";
import {FileUploadData} from "./utils/types";

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
const verifyFileJwtToken = verifyAndDecodeJwtToken<FileUploadData>;

const ATTACHMENT_PATH   = "apath";
const ATTACHMENT_MIME   = "amime";
const ATTACHMENT_NAME   = "aname";
const MESSAGE_GROUP     = "group";
const MESSAGE_TIMESTAMP = "ts";
const MESSAGE_TEXT      = "text";
const MESSAGE_SENDER_ID = "from";
const MESSAGE_ID        = "id";

const GetMessages_ProjectionExpression     = [
	MESSAGE_TIMESTAMP, MESSAGE_TEXT, MESSAGE_SENDER_ID, MESSAGE_ID,
	ATTACHMENT_PATH, ATTACHMENT_NAME, ATTACHMENT_MIME
].map(v => "#" + v).join(",");
const GetMessages_EAV_CNeedGroup           = ":needGroup";
const GetMessages_KeyConditionExpression   = `#${MESSAGE_GROUP} = ${GetMessages_EAV_CNeedGroup}`;
const GetMessages_ExpressionAttributeNames = [
	MESSAGE_GROUP,
	MESSAGE_TIMESTAMP, MESSAGE_TEXT, MESSAGE_SENDER_ID, MESSAGE_ID,
	ATTACHMENT_PATH, ATTACHMENT_NAME, ATTACHMENT_MIME
].reduce((prev, curr) => {
	prev["#" + curr] = curr;
	return prev;
}, {} as Record<string, string>);

let fakeOn = true ? undefined as never : eventsSender(jfChatterBoxApiSchema, {validateEventsBody: true, endpoint: ""});

export class JusticeFirmWsRestAPIImpl
	extends JusticeFirmRestAPIImpl
	implements WSAPIImplementation<typeof jfChatterBoxApiSchema> {
	on: typeof fakeOn;

	constructor () {
		super();
		this.setup().catch(ex => console.trace(ex));
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
		const putResponse = await dynamoDbClient.send(new PutItemCommand({
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
		const {group: groupId, user}    = jwt;
		const now                       = Date.now();
		const messageData: MessageData  = {
			group: groupId,
			ts:    now.toString(10),
			text,
			from:  user,
			id:    uniqId(),
		};
		const putMessageResponse        = await dynamoDbClient.send(new PutItemCommand({
			TableName:              messagesTableName,
			Item:                   {
				[MESSAGE_GROUP]:     {S: messageData.group},
				[MESSAGE_TIMESTAMP]: {S: messageData.ts},
				[MESSAGE_TEXT]:      {S: messageData.text},
				[MESSAGE_SENDER_ID]: {S: messageData.from},
				[MESSAGE_ID]:        {S: messageData.id},
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("postMessage: message", putMessageResponse);

		return await this.sendMessageEventToGroup(groupId, messageData);
	}

	async postMessageWithAttachment (params: WSFnParams<PostMessageWithAttachmentInput>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Nuly | Message>> {
		const {chatAuthToken, text, uploadedFile}  = params.body;
		const jwtSecret                            = await this.getJwtSecret();
		const jwt: PrivateChatAuthToken            = await verifyChatJwtToken(chatAuthToken.jwt, jwtSecret);
		const file: FileUploadData                 = await verifyFileJwtToken(uploadedFile.jwt, jwtSecret);
		const {group: groupId, user}               = jwt;
		const now                                  = Date.now();
		const messageData: MessageData             = {
			group:      groupId,
			ts:         now.toString(10),
			text,
			from:       user,
			id:         uniqId(),
			attachment: file,
		};
		const item: Record<string, AttributeValue> = {
			[MESSAGE_GROUP]:     {S: messageData.group},
			[MESSAGE_TIMESTAMP]: {S: messageData.ts},
			[MESSAGE_TEXT]:      {S: messageData.text},
			[MESSAGE_SENDER_ID]: {S: messageData.from},
			[MESSAGE_ID]:        {S: messageData.id},
			[ATTACHMENT_MIME]:   {S: file.mime},
			[ATTACHMENT_PATH]:   {S: shortenS3Url(file.path)},
		};
		if (!isNullOrEmpty(file.name)) {
			item[ATTACHMENT_NAME] = {S: file.name};
		}
		const putMessageResponse = await dynamoDbClient.send(new PutItemCommand({
			TableName:              messagesTableName,
			Item:                   item,
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("postMessage: message", putMessageResponse);

		return await this.sendMessageEventToGroup(groupId, messageData);
	}

	async getMessages (params: WSFnParams<GetMessagesInput>, event: APIGatewayProxyWebsocketEventV2):
		Promise<EndpointResult<Message | MessageData[]>> {
		const jwtSecret                 = await this.getJwtSecret();
		const jwt: PrivateChatAuthToken = await verifyChatJwtToken(params.body.chatAuthToken.jwt, jwtSecret);
		const {group, user}             = jwt;

		const queryResponse: QueryCommandOutput = await dynamoDbClient.send(new QueryCommand({
			TableName:                 messagesTableName,
			ProjectionExpression:      GetMessages_ProjectionExpression,
			KeyConditionExpression:    GetMessages_KeyConditionExpression,
			ExpressionAttributeNames:  GetMessages_ExpressionAttributeNames,
			ExpressionAttributeValues: {
				[GetMessages_EAV_CNeedGroup]: {S: group}
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));

		printConsumedCapacity("getMessages", queryResponse);

		if (queryResponse.Items == null || queryResponse.Items.length === 0)
			return response(200, []);
		console.log(queryResponse.Items);
		return response(200, queryResponse.Items.map(value => {
			const fileName = value[ATTACHMENT_NAME]?.S;
			const fileMime = value[ATTACHMENT_MIME]?.S;
			const filePath = value[ATTACHMENT_PATH]?.S;
			let fileData: FileUploadData | Nuly;
			if (/*fileName != null &&*/ fileMime != null && filePath != null) {
				fileData = {
					name: fileName,
					mime: fileMime,
					path: unShortenS3Url(filePath)
				};
			}
			return ({
				group:      group,
				ts:         value[MESSAGE_TIMESTAMP].S,
				text:       value[MESSAGE_TEXT].S,
				from:       value[MESSAGE_SENDER_ID].S,
				id:         value[MESSAGE_ID].S,
				attachment: fileData
			} as MessageData);
		}));
	}

	private async sendMessageEventToGroup (group: string, messageData: MessageData) {
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
}
