import {Static, Type} from "@sinclair/typebox";
import {lazyCheck} from "../singularity/helpers";
import {ID_T, UserAccessType, UserAccessType_T} from "./db-types";
import {OptionalString_T, String_T} from "./utils/types";

export const JWTHashedData = Type.Object({
	id: ID_T,
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	userType:   UserAccessType_T,
});

const oth = {
	id: ID_T,
	// TODO: Implement expiry date
	expiryDate: Type.Any(),
	jwt:        String_T,
	name:       OptionalString_T
};

export const AuthToken = Type.Object({
	...oth,
	userType: UserAccessType_T,
}, {$id: "AuthToken"});
export type AuthToken = Static<typeof AuthToken>;

export type ConstrainedAuthToken<T extends UserAccessType> = Omit<AuthToken, "userType"> & {
	userType: T
};

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
