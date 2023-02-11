import {Static, Type} from "@sinclair/typebox";
import {phoneRegex}   from "./utils/constants";

export const CaseType = Type.Object({
	id:   Type.Number(),
	type: Type.String(),
}, {$id: "CaseType"});

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

export const User = Type.Object({
	id:           Type.Number(),
	name:         Type.String(),
	email:        Type.String({
		format: "email"
	}),
	phone:        Type.RegEx(phoneRegex),
	address:      Type.String(),
	passwordHash: Type.String(),
	photoPath:    Type.String(),
	type:         UserAccessType_T,
}, {$id: "User"});

export const Administrator = Type.Intersect([
		User,
		Type.Object({
			jobPost: Type.String(),
		})
	],
	{$id: "Administrator"});

export const Lawyer = Type.Intersect([
	User,
	Type.Object({
		latitude:          Type.Number(),
		longitude:         Type.Number(),
		certificationLink: Type.String(),
		status:            StatusEnum_T,
	})
], {$id: "Lawyer"});

export const Client = Type.Intersect([User, Type.Object({})], {$id: "Client"});

export type CaseType = Static<typeof CaseType>;
export type User = Static<typeof User>;
export type Administrator = Static<typeof Administrator>;
export type Lawyer = Static<typeof Lawyer>;
export type Client = Static<typeof Client>;
