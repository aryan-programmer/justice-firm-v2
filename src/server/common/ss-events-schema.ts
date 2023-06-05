import {Static, Type} from "@sinclair/typebox";
import {ID_T, IDWithName, StatusEnum, UserNameWithType} from "../../common/db-types";
import {trimmedDescriptionMaxLength} from "../../common/utils/constants";
import {ArrayOf} from "../../common/utils/functions";
import {OptionalBoolean_T, String_T} from "../../common/utils/types";
import {eventsModelSchema} from "../../singularity/events/events-endpoint";
import {lazyCheck} from "../../singularity/helpers";
import {FileUploadData} from "./utils/types";

export const LawyerProfileUpdateData = Type.Object({
	ids:                           ArrayOf(ID_T),
	invalidateCaseSpecializations: OptionalBoolean_T,
}, {$id: "LawyerProfileUpdateData"});
export type LawyerProfileUpdateData = Static<typeof LawyerProfileUpdateData>;

export const LawyersStatusesUpdateData = Type.Object({
	confirmed: ArrayOf(ID_T),
	rejected:  ArrayOf(Type.Object({
		id:     ID_T,
		reason: String_T
	})),
	waiting:   ArrayOf(ID_T),
}, {$id: "LawyersStatusesUpdateData"});
export type LawyersStatusesUpdateData = Static<typeof LawyersStatusesUpdateData>;

export const NewAppointmentRequestData = Type.Object({
	appointmentId:      ID_T,
	lawyerId:           ID_T,
	client:             IDWithName,
	openedOn:           String_T,
	trimmedDescription: Type.String({maxLength: trimmedDescriptionMaxLength}),
}, {$id: "NewAppointmentRequestData"});
export type NewAppointmentRequestData = Static<typeof NewAppointmentRequestData>;

export const AppointmentRejectedData     = Type.Object({
	clientId:      ID_T,
	lawyer:        IDWithName,
	appointmentId: ID_T,
	status:        Type.Literal(StatusEnum.Rejected),
});
export const AppointmentConfirmedData    = Type.Object({
	clientId:      ID_T,
	lawyer:        IDWithName,
	appointmentId: ID_T,
	status:        Type.Literal(StatusEnum.Confirmed),
	timestamp:     String_T,
});
export const AppointmentStatusUpdateData = Type.Union([
	AppointmentRejectedData,
	AppointmentConfirmedData
], {$id: "AppointmentStatusUpdateData"});
export type AppointmentStatusUpdateData = Static<typeof AppointmentStatusUpdateData>;

export const CaseUpgradeFromAppointmentData = Type.Object({
	appointmentId:          ID_T,
	caseId:                 ID_T,
	clientId:               ID_T,
	lawyer:                 IDWithName,
	trimmedCaseDescription: Type.String({maxLength: trimmedDescriptionMaxLength}),
}, {$id: "CaseUpgradeFromAppointmentData"});
export type CaseUpgradeFromAppointmentData = Static<typeof CaseUpgradeFromAppointmentData>;

export const CaseDocumentUploadedData = Type.Object({
	caseDocumentId:             ID_T,
	caseId:                     ID_T,
	sender:                     UserNameWithType,
	recipient:                  UserNameWithType,
	documentUploadData:         FileUploadData,
	trimmedDocumentDescription: Type.String({maxLength: trimmedDescriptionMaxLength}),
}, {$id: "CaseDocumentUploadedData"});
export type CaseDocumentUploadedData = Static<typeof CaseDocumentUploadedData>;

export const ssEventsSchema = eventsModelSchema({
	name:   "JusticeFirm-ServerSide-EventsSchema",
	events: {
		lawyerProfileUpdate:        lazyCheck(LawyerProfileUpdateData),
		lawyersStatusesUpdate:      lazyCheck(LawyersStatusesUpdateData),
		newAppointmentRequest:      lazyCheck(NewAppointmentRequestData),
		appointmentStatusUpdate:    lazyCheck(AppointmentStatusUpdateData),
		caseUpgradeFromAppointment: lazyCheck(CaseUpgradeFromAppointmentData),
		caseDocumentUploaded:       lazyCheck(CaseDocumentUploadedData),
	},
});
