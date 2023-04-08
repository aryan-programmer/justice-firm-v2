import {Static, Type} from "@sinclair/typebox";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {wsEndpoint, wsModelSchema} from "../singularity/websocket/ws-endpoint";
import {AuthToken} from "./api-types";
import {ID_T} from "./db-types";
import {ArrayOf, Optional} from "./utils/functions";
import {Nuly, String_T} from "./utils/types";

export const PrivateChatAuthToken = Type.Object({
	group: String_T,
	user:  String_T,
}, {$id: "PrivateChatAuthToken"});
export type PrivateChatAuthToken = Static<typeof PrivateChatAuthToken>;

export const ChatAuthToken = Type.Intersect([PrivateChatAuthToken, Type.Object({
	jwt: String_T,
})], {$id: "ChatAuthToken"});
export type ChatAuthToken = Static<typeof ChatAuthToken>;

export const EstablishConnectionInput = Type.Object({
	group:     ID_T,
	authToken: AuthToken
}, {$id: "EstablishConnectionInput"});
export type EstablishConnectionInput = Static<typeof EstablishConnectionInput>;

export const ChatGroupData = Type.Object({
	name:   String_T,
	caseId: Optional(ID_T),
	client: Type.Object({
		id:   ID_T,
		name: String_T,
	}),
	lawyer: Type.Object({
		id:   ID_T,
		name: String_T,
	}),
}, {$id: "ChatGroupData"});
export type ChatGroupData = Static<typeof ChatGroupData>;

export const EstablishConnectionOutput = Type.Intersect([ChatGroupData, Type.Object({
	chatAuthToken: ChatAuthToken,
})], {$id: "EstablishConnectionOutput"});
export type EstablishConnectionOutput = Static<typeof EstablishConnectionOutput>;

export const PostMessageInput = Type.Object({
	text:          String_T,
	chatAuthToken: ChatAuthToken,
}, {$id: "PostMessageInput"});
export type PostMessageInput = Static<typeof PostMessageInput>;

export const GetMessagesInput = Type.Object({
	chatAuthToken: ChatAuthToken,
}, {$id: "GetMessagesInput"});
export type GetMessagesInput = Static<typeof GetMessagesInput>;

export const MessageData = Type.Object({
	group: ID_T,
	ts:    String_T,
	text:  String_T,
	from:  ID_T,
	id:    String_T,
}, {$id: "MessageData"});
export type MessageData = Static<typeof MessageData>;

export const jfChatterBoxApiSchema = wsModelSchema({
	name:      "JFChatterBoxApi",
	endpoints: {
		$connect:            wsEndpoint({
			path:               "$connect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
		establishConnection: wsEndpoint({
			path:                "establishConnection",
			requestBodyChecker:  lazyCheck(EstablishConnectionInput),
			responseBodyChecker: lazyCheck(MessageOr(EstablishConnectionOutput))
		}),
		$disconnect:         wsEndpoint({
			path:               "$disconnect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
		postMessage:         wsEndpoint({
			path:                "postMessage",
			requestBodyChecker:  lazyCheck(PostMessageInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		getMessages:         wsEndpoint({
			path:                "getMessages",
			requestBodyChecker:  lazyCheck(GetMessagesInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(MessageData))),
		}),
	},
	events:    {
		incomingMessage: lazyCheck(MessageData),
	}
})
