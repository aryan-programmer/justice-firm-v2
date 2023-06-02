import {Static, Type} from "@sinclair/typebox";
import {FileUploadData, FileUploadToken} from "../server/common/utils/types";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {wsEndpoint, wsModelSchema} from "../singularity/websocket/ws-endpoint";
import {AuthToken} from "./api-types";
import {ID_T, IDWithName} from "./db-types";
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

export const EstablishChatConnectionInput = Type.Object({
	group:     ID_T,
	authToken: AuthToken
}, {$id: "EstablishChatConnectionInput"});
export type EstablishChatConnectionInput = Static<typeof EstablishChatConnectionInput>;

export const ChatGroupData = Type.Object({
	name:   String_T,
	caseId: Optional(ID_T),
	client: IDWithName,
	lawyer: IDWithName,
}, {$id: "ChatGroupData"});
export type ChatGroupData = Static<typeof ChatGroupData>;

export const EstablishChatConnectionOutput = Type.Intersect([ChatGroupData, Type.Object({
	chatAuthToken: ChatAuthToken,
})], {$id: "EstablishChatConnectionOutput"});
export type EstablishChatConnectionOutput = Static<typeof EstablishChatConnectionOutput>;

export const PostMessageInput = Type.Object({
	text:          String_T,
	chatAuthToken: ChatAuthToken,
}, {$id: "PostMessageInput"});
export type PostMessageInput = Static<typeof PostMessageInput>;

export const PostMessageWithAttachmentInput = Type.Intersect([PostMessageInput, Type.Object({
	uploadedFile: FileUploadToken,
})], {$id: "PostMessageWithAttachmentInput"});
export type PostMessageWithAttachmentInput = Static<typeof PostMessageWithAttachmentInput>;

export const GetMessagesInput = Type.Object({
	chatAuthToken: ChatAuthToken,
}, {$id: "GetMessagesInput"});
export type GetMessagesInput = Static<typeof GetMessagesInput>;

export const MessageData = Type.Object({
	group:      ID_T,
	ts:         String_T,
	text:       String_T,
	from:       ID_T,
	id:         String_T,
	attachment: Optional(FileUploadData),
}, {$id: "MessageData"});
export type MessageData = Static<typeof MessageData>;

export const jfChatterBoxApiSchema = wsModelSchema({
	name:      "JFChatterBoxApi",
	endpoints: {
		$connect:                  wsEndpoint({
			path:               "$connect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
		establishConnection:       wsEndpoint({
			path:                "establishConnection",
			requestBodyChecker:  lazyCheck(EstablishChatConnectionInput),
			responseBodyChecker: lazyCheck(MessageOr(EstablishChatConnectionOutput))
		}),
		$disconnect:               wsEndpoint({
			path:               "$disconnect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
		postMessage:               wsEndpoint({
			path:                "postMessage",
			requestBodyChecker:  lazyCheck(PostMessageInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		postMessageWithAttachment: wsEndpoint({
			path:                "postMessageWithAttachment",
			requestBodyChecker:  lazyCheck(PostMessageWithAttachmentInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		getMessages:               wsEndpoint({
			path:                "getMessages",
			requestBodyChecker:  lazyCheck(GetMessagesInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(MessageData))),
		}),
	},
	events:    {
		incomingMessage: lazyCheck(MessageData),
	}
});
