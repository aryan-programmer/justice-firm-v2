import {Static, Type} from "@sinclair/typebox";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {wsEndpoint, wsModelSchema} from "../singularity/websocket/ws-endpoint";
import {AuthToken} from "./api-types";
import {NotificationMessageData} from "./notification-types";
import {ArrayOf} from "./utils/functions";
import {Boolean_T, Nuly, String_T} from "./utils/types";

export const EstablishNotificationsConnectionInput = Type.Object({
	authToken: AuthToken
}, {$id: "EstablishNotificationsConnectionInput"});
export type EstablishNotificationsConnectionInput = Static<typeof EstablishNotificationsConnectionInput>;

export const GetNotificationsInput = Type.Object({
	authToken: AuthToken,
}, {$id: "GetNotificationsInput"});
export type GetNotificationsInput = Static<typeof GetNotificationsInput>;

export const GetNotificationsOutput = Type.Object({
	notifications:       ArrayOf(NotificationMessageData),
	unreadNotifications: ArrayOf(String_T),
}, {$id: "GetNotificationsOutput"});
export type GetNotificationsOutput = Static<typeof GetNotificationsOutput>;

export const SetIsReadStatusInput = Type.Object({
	authToken:      AuthToken,
	isRead:         Boolean_T,
	notificationId: String_T,
}, {$id: "SetIsReadStatusInput"});
export type SetIsReadStatusInput = Static<typeof SetIsReadStatusInput>;

export const MarkAllAsReadInput = Type.Object({
	authToken: AuthToken,
}, {$id: "MarkAllAsReadInput"});
export type MarkAllAsReadInput = Static<typeof MarkAllAsReadInput>;

export const jfNotificationsApiSchema = wsModelSchema({
	name:      "JFNotificationsApi",
	endpoints: {
		$connect:            wsEndpoint({
			path:               "$connect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
		establishConnection: wsEndpoint({
			path:                "establishConnection",
			requestBodyChecker:  lazyCheck(EstablishNotificationsConnectionInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly))
		}),
		getNotifications:    wsEndpoint({
			path:                "getNotifications",
			requestBodyChecker:  lazyCheck(GetNotificationsInput),
			responseBodyChecker: lazyCheck(MessageOr(GetNotificationsOutput))
		}),
		setIsReadStatus:     wsEndpoint({
			path:               "setIsReadStatus",
			requestBodyChecker: lazyCheck(SetIsReadStatusInput),
		}),
		markAllAsRead:       wsEndpoint({
			path:               "markAllAsRead",
			requestBodyChecker: lazyCheck(MarkAllAsReadInput),
		}),
		$disconnect:         wsEndpoint({
			path:               "$disconnect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
	},
	events:    {
		notification:        lazyCheck(NotificationMessageData),
		unreadNotifications: lazyCheck(ArrayOf(String_T)),
	}
});
