import {Static, Type} from "@sinclair/typebox";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {wsEndpoint, wsModelSchema} from "../singularity/websocket/ws-endpoint";
import {AuthToken} from "./api-types";
import {Nuly} from "./utils/types";

export const EstablishNotificationsConnectionInput = Type.Object({
	authToken: AuthToken
}, {$id: "EstablishNotificationsConnectionInput"});
export type EstablishNotificationsConnectionInput = Static<typeof EstablishNotificationsConnectionInput>;

export const Notification = Type.Any({$id: "Notification"});
export type Notification = Static<typeof Notification>;

export const jfNotificationsApiSchema = wsModelSchema({
	name:      "JFNotificationsBoxApi",
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
		$disconnect:         wsEndpoint({
			path:               "$disconnect",
			requestBodyChecker: lazyCheck(Nuly),
		}),
	},
	events:    {
		notification: lazyCheck(Notification),
	}
})
