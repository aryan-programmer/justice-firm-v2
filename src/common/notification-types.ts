import {Static, TEnum, TLiteral, Type} from "@sinclair/typebox";
import {ID_T, StatusEnum_T} from "./db-types";
import {OptionalString_T, String_T} from "./utils/types";

export enum NotificationType {
	LawyerStatusUpdate = "0",
}

export const NotificationType_T = (function () {
	const res  = Type.Enum(NotificationType, {$id: "NotificationType"});
	const keys = Object.keys(NotificationType);
	for (let i = 0; i < keys.length; i++) {
		const elem = keys[i] as keyof typeof NotificationType;
		res[elem]  = Type.Literal(NotificationType[elem], {$id: "NotificationType." + elem});
	}
	return res as TEnum<typeof NotificationType> & {
		[V in keyof typeof NotificationType]: TLiteral<(typeof NotificationType)[V]>
	};
})();

export const LawyerStatusUpdateNotification = Type.Object({
	type:            NotificationType_T.LawyerStatusUpdate,
	status:          StatusEnum_T,
	rejectionReason: OptionalString_T,
}, {$id: "LawyerStatusUpdateNotification"});
export type LawyerStatusUpdateNotification = Static<typeof LawyerStatusUpdateNotification>;

export const UserNotification = Type.Union([
	LawyerStatusUpdateNotification
], {$id: "UserNotification"});
export type UserNotification = Static<typeof UserNotification>;

export const NotificationMessageData = Type.Object({
	groupId:      ID_T,
	timestamp:    String_T,
	id:           String_T,
	notification: UserNotification,
}, {$id: "NotificationMessageData"});
export type NotificationMessageData = Static<typeof NotificationMessageData>;
