import {Static, Type} from "@sinclair/typebox";
import {FileUploadData} from "../server/utils/types";
import {StatusEnum, StatusSearchOptionsEnum, ValidEmail, ValidPhone} from "./utils/constants";
import {ArrayOf, Optional} from "./utils/functions";
import {Number_T, OptionalString_T, String_T} from "./utils/types";

export {StatusEnum, StatusSearchOptionsEnum} from "./utils/constants";

export const ID_T = Type.String({$id: "ID_T"});
export type ID_T = string;

export const CaseType = Type.Object({
	name: Type.String(),
	id:   Type.String(),
}, {$id: "CaseType"});
export type CaseType = Static<typeof CaseType>;

export enum UserAccessType {
	Client = 'client',
	Lawyer = 'lawyer',
	Admin  = 'admin'
}

export const UserAccessType_T = Type.Enum(UserAccessType, {$id: "UserAccessType"})


export const StatusSearchOptionsEnum_T = Type.Enum(StatusSearchOptionsEnum, {$id: "StatusSearchOptionsEnum"})
export const StatusEnum_T              = Type.Enum(StatusEnum, {$id: "StatusEnum"})

export const StatusSearchOptions = Type.Union([StatusSearchOptionsEnum_T, StatusEnum_T], {$id: "StatusSearchOptions"});
export type StatusSearchOptions = StatusSearchOptionsEnum | StatusEnum;

export enum CaseStatusEnum {
	Waiting = 'waiting',
	Open    = 'open',
	Closed  = 'closed'
}

export const CaseStatusEnum_T = Type.Enum(CaseStatusEnum, {$id: "CaseStatusEnum"})

export const User = Type.Object({
	id:           ID_T,
	name:         String_T,
	email:        ValidEmail,
	phone:        ValidPhone,
	address:      String_T,
	passwordHash: String_T,
	photoPath:    String_T,
	type:         UserAccessType_T,
	gender:       String_T
}, {$id: "User"});
export type User = Static<typeof User>;

export const Administrator = Type.Intersect([
	User,
	Type.Object({
		jobPost: String_T,
	})
], {$id: "Administrator"});
export type Administrator = Static<typeof Administrator>;

export const Lawyer = Type.Intersect([
	User,
	Type.Object({
		latitude:          Type.Number(),
		longitude:         Type.Number(),
		certificationLink: String_T,
		status:            StatusEnum_T,
		rejectionReason:   OptionalString_T,
	})
], {$id: "Lawyer"});
export type Lawyer = Static<typeof Lawyer>;

export const Client = Type.Intersect([User, Type.Object({})], {$id: "Client"});
export type Client = Static<typeof Client>;

export const IDWithName = Type.Object({
	id:   ID_T,
	name: String_T,
}, {$id: "IDWithName"});
export type IDWithName = Static<typeof IDWithName>;

export const CaseDocumentData = Type.Object({
	id:          ID_T,
	file:        FileUploadData,
	description: String_T,
	uploadedBy:  IDWithName,
	uploadedOn:  String_T,
}, {$id: "CaseDocumentData"});
export type CaseDocumentData = Static<typeof CaseDocumentData>;

export const LawyerStatistics = Type.Object({
	rejectedAppointments:  Number_T,
	waitingAppointments:   Number_T,
	confirmedAppointments: Number_T,
	totalAppointments:     Number_T,
	totalCases:            Number_T,
	totalClients:          Number_T,
}, {$id: "LawyerStatistics"});
export type LawyerStatistics = Static<typeof LawyerStatistics>;

export const AppointmentBareData = Type.Object({
	id:        ID_T,
	othId:     ID_T,
	othName:   String_T,
	timestamp: OptionalString_T,
	openedOn:  String_T,
	status:    StatusEnum_T,
	caseId:    Optional(ID_T),
}, {$id: "AppointmentBareData"});
export type AppointmentBareData = Static<typeof AppointmentBareData>;

export const CaseBareData = Type.Object({
	id:       ID_T,
	othId:    ID_T,
	othName:  String_T,
	caseType: CaseType,
	openedOn: String_T,
	status:   CaseStatusEnum_T,
}, {$id: "CaseBareData"});
export type CaseBareData = Static<typeof CaseBareData>;

export const LawyerSearchResult = Type.Intersect([
	Type.Omit(Lawyer, ["type", "passwordHash", "status"]),
	Type.Object({
		distance:            Optional(Number_T),
		caseSpecializations: Optional(ArrayOf(CaseType)),
		status:              StatusEnum_T,
		statistics:          Optional(LawyerStatistics),
		cases:               Optional(ArrayOf(CaseBareData)),
		appointments:        Optional(ArrayOf(AppointmentBareData)),
	})
], {$id: "LawyerSearchResult"});
export type LawyerSearchResult = Static<typeof LawyerSearchResult>;

export const ClientDataResult = Type.Omit(Client, ["type", "passwordHash"], {$id: "ClientDataResult"});
export type ClientDataResult = Omit<Client, "type" | "passwordHash">;
