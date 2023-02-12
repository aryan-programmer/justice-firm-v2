import {Static, Type} from "@sinclair/typebox";
import {lazyCheck} from "../singularity/helpers";
import {UserAccessType_T} from "./db-types";

export const PrivateAuthToken = Type.Object({
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
});

export const AuthTokenChecker = lazyCheck(AuthToken);

export type PrivateAuthToken = Static<typeof PrivateAuthToken>;
export type AuthToken = Static<typeof AuthToken>;
