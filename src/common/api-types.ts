import {Static, Type}     from "@sinclair/typebox";
import {UserAccessType_T} from "./db-types";

export const PrivateAuthToken = Type.Object({
	id: Type.Number(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
});

export const AuthToken = Type.Object({
	id: Type.Number(),
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
	jwt:        Type.String(),
});

export type AuthToken = Static<typeof AuthToken>;
