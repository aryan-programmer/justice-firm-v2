import {Static, Type} from "@sinclair/typebox";
import {lazyCheck} from "../singularity/helpers";
import {UserAccessType, UserAccessType_T} from "./db-types";

export const JWTHashedData = Type.Object({
	id: Type.String(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
});

export const AuthToken = Type.Object({
	id: Type.String(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
	jwt:        Type.String(),
}, {$id: "AuthToken"});

export const ClientAuthToken = Type.Object({
	id: Type.String(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   Type.Literal(UserAccessType.Client),
	jwt:        Type.String(),
});

export type ClientAuthToken = Static<typeof ClientAuthToken>;

export const AuthTokenChecker = lazyCheck(AuthToken);

export type JWTHashedData = Static<typeof JWTHashedData>;
export type AuthToken = Static<typeof AuthToken>;
