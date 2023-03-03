import {Static, Type} from "@sinclair/typebox";
import {lazyCheck} from "../singularity/helpers";
import {UserAccessType, UserAccessType_T} from "./db-types";

export const JWTHashedData = Type.Object({
	id: Type.String(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
});

const oth = {
	id: Type.String(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	jwt:        Type.String(),
};

export const AuthToken = Type.Object({
	...oth,
	userType: UserAccessType_T,
}, {$id: "AuthToken"});

export const ClientAuthToken = Type.Object({
	...oth,
	userType: Type.Literal(UserAccessType.Client),
});

export type ClientAuthToken = Static<typeof ClientAuthToken>;

export const AdminAuthToken = Type.Object({
	...oth,
	userType: Type.Literal(UserAccessType.Admin),
});

export type AdminAuthToken = Static<typeof AdminAuthToken>;

export const LawyerAuthToken = Type.Object({
	...oth,
	userType: Type.Literal(UserAccessType.Lawyer),
});

export type LawyerAuthToken = Static<typeof LawyerAuthToken>;

export const AuthTokenChecker = lazyCheck(AuthToken);

export type JWTHashedData = Static<typeof JWTHashedData>;
export type AuthToken = Static<typeof AuthToken>;
