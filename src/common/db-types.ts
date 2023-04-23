import {Static, Type} from "@sinclair/typebox";
import {FileUploadData} from "../server/utils/types";
import {ValidEmail, ValidPhone} from "./utils/constants";
import {ArrayOf, Optional} from "./utils/functions";
import {Number_T, String_T} from "./utils/types";

export const ID_T = Type.String({$id: "ID_T"});
export type ID_T = string;

export const CaseType = Type.Object({
	id:   ID_T,
	name: String_T,
}, {$id: "CaseType"});
export type CaseType = Static<typeof CaseType>;

export enum UserAccessType {
	Client = 'client',
	Lawyer = 'lawyer',
	Admin  = 'admin'
}

export const UserAccessType_T = Type.Enum(UserAccessType, {$id: "UserAccessType"})

export enum StatusEnum {
	Waiting   = 'waiting',
	Rejected  = 'rejected',
	Confirmed = 'confirmed'
}

export const StatusEnum_T = Type.Enum(StatusEnum, {$id: "StatusEnum"})

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
	gender:       Optional(String_T)
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

export const LawyerSearchResult = Type.Intersect([
	Type.Omit(Lawyer, ["type", "passwordHash", "status"]),
	Type.Object({
		distance:            Optional(Number_T),
		caseSpecializations: Optional(ArrayOf(CaseType)),
		status:              Optional(StatusEnum_T),
	})
], {$id: "LawyerSearchResult"});
export type LawyerSearchResult = Static<typeof LawyerSearchResult>;

export const ClientDataResult = Type.Omit(Client, ["type", "passwordHash"], {$id: "ClientDataResult"});
export type ClientDataResult = Omit<Client, "type" | "passwordHash">;
