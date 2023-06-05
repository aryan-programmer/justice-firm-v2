import {Static, TEnum, TLiteral, TObject, Type} from "@sinclair/typebox";
import {
	AppointmentConfirmedData,
	AppointmentRejectedData,
	CaseDocumentUploadedData,
	CaseUpgradeFromAppointmentData,
	NewAppointmentRequestData
} from "../server/common/ss-events-schema";
import {ID_T, StatusEnum_T} from "./db-types";
import {OptionalString_T, String_T} from "./utils/types";

export enum NotificationType {
	LawyerStatusUpdate         = "0",
	NewAppointmentRequest      = "1",
	AppointmentStatusUpdate    = "2",
	CaseUpgradeFromAppointment = "3",
	CaseDocumentUploaded       = "4",
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

function WithTypeField<T extends TObject, TNotif extends NotificationType> (orig: T, notif: TLiteral<TNotif>, id?: string) {
	return Type.Intersect([
		orig,
		Type.Object({
			type: notif
		})
	], {$id: id});
}

export const LawyerStatusUpdateNotification = Type.Object({
	type:            NotificationType_T.LawyerStatusUpdate,
	status:          StatusEnum_T,
	rejectionReason: OptionalString_T,
}, {$id: "LawyerStatusUpdateNotification"});
export type LawyerStatusUpdateNotification = Static<typeof LawyerStatusUpdateNotification>;

export const NewAppointmentRequestNotification = WithTypeField(
	Type.Omit(
		NewAppointmentRequestData,
		["lawyerId", "openedOn"]
	),
	NotificationType_T.NewAppointmentRequest,
	"NewAppointmentRequestNotification"
);
export type NewAppointmentRequestNotification = Static<typeof NewAppointmentRequestNotification>;

export const AppointmentStatusUpdateNotification = Type.Union([
	WithTypeField(Type.Omit(AppointmentRejectedData, ["clientId"]), NotificationType_T.AppointmentStatusUpdate),
	WithTypeField(Type.Omit(AppointmentConfirmedData, ["clientId"]), NotificationType_T.AppointmentStatusUpdate),
], {$id: "AppointmentStatusUpdateNotification"});
export type AppointmentStatusUpdateNotification = Static<typeof AppointmentStatusUpdateNotification>;

export const CaseUpgradeFromAppointmentNotification = WithTypeField(
	Type.Omit(
		CaseUpgradeFromAppointmentData,
		["clientId"]
	),
	NotificationType_T.CaseUpgradeFromAppointment,
	"CaseUpgradeFromAppointmentNotification"
);
export type CaseUpgradeFromAppointmentNotification = Static<typeof CaseUpgradeFromAppointmentNotification>;

export const CaseDocumentUploadedNotification = WithTypeField(
	Type.Omit(
		CaseDocumentUploadedData,
		["recipient"]
	),
	NotificationType_T.CaseDocumentUploaded,
	"CaseDocumentUploadedNotification"
);
export type CaseDocumentUploadedNotification = Static<typeof CaseDocumentUploadedNotification>;

export const UserNotification = Type.Union([
	LawyerStatusUpdateNotification,
	NewAppointmentRequestNotification,
	AppointmentStatusUpdateNotification,
	CaseUpgradeFromAppointmentNotification,
	CaseDocumentUploadedNotification,
], {$id: "UserNotification"});
export type UserNotification = Static<typeof UserNotification>;

export const NotificationMessageData = Type.Object({
	groupId:      ID_T,
	timestamp:    String_T,
	id:           String_T,
	notification: UserNotification,
}, {$id: "NotificationMessageData"});
export type NotificationMessageData = Static<typeof NotificationMessageData>;
