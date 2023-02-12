import {Static, Type} from "@sinclair/typebox";
import {endpoint} from "../singularity/endpoint";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {HttpMethods} from "../singularity/httpMethods";
import {modelSchema} from "../singularity/schema";
import {AuthToken} from "./api-types";
import {Client, Lawyer} from "./db-types";
import {maxDataUrlLen, ValidEmail, ValidPassword} from "./utils/constants";
import {ArrayOf, Optional} from "./utils/functions";
import {Nuly} from "./utils/types";

export const RegisterLawyerInput = Type.Intersect([
	Type.Omit(Lawyer, ["id", "photoPath", "type", "certificationLink", "status", "passwordHash"]),
	Type.Object({
		password:            ValidPassword,
		photoData:           Type.String({maxLength: maxDataUrlLen}),
		certificationData:   Type.String({maxLength: maxDataUrlLen}),
		specializationTypes: Type.Array(Type.Number({minimum: 0})),
	})
], {$id: "RegisterLawyerInput"});
export type RegisterLawyerInput = Static<typeof RegisterLawyerInput>;

export const RegisterClientInput = Type.Intersect([
	Type.Omit(Client, ["id", "photoPath", "type", "passwordHash"]),
	Type.Object({
		password:  ValidPassword,
		photoData: Type.String({maxLength: maxDataUrlLen}),
	})
], {$id: "RegisterClientInput"});
export type RegisterClientInput = Static<typeof RegisterClientInput>;

export const SessionLoginInput = Type.Object({
	email:    ValidEmail,
	password: ValidPassword,
}, {$id: "SessionLoginInput"});
export type SessionLoginInput = Static<typeof SessionLoginInput>;

export const MessageOrAuthToken = MessageOr(AuthToken);

export const SearchLawyersBaseInput = Type.Partial(Type.Object({
	name:    Type.String(),
	address: Type.String(),
}), {$id: "SearchLawyersBaseInput"});
export type SearchLawyersBaseInput = Static<typeof SearchLawyersBaseInput>;

const LawyerSearchResult = Type.Intersect([
	Type.Omit(Lawyer, ["type", "passwordHash"]),
	Type.Object({
		distance: Optional(Type.Number()),
	})
], {$id: "LawyerSearchResult"});
export type LawyerSearchResult = Omit<Lawyer, "type" | "passwordHash"> & { distance: number | Nuly };
const LawyerSearchResults = ArrayOf(LawyerSearchResult);

export const SearchAndSortLawyersInput = Type.Partial(Type.Object({
	name:      Type.String(),
	address:   Type.String(),
	latitude:  Type.Number(),
	longitude: Type.Number(),
}), {$id: "SearchAndSortLawyersInput"});
export type SearchAndSortLawyersInput = Static<typeof SearchAndSortLawyersInput>;

export const SearchLawyersInput = Type.Union([SearchLawyersBaseInput, SearchAndSortLawyersInput],
	{$id: "SearchLawyersInput"});
export type SearchLawyersInput = SearchLawyersBaseInput | SearchAndSortLawyersInput;

export const GetLawyerInput = Type.Pick(Lawyer, ["id"], {$id: "GetLawyerInput"});
export type GetLawyerInput = Pick<Lawyer, "id">;

export const justiceFirmApiSchema = modelSchema({
	name:      "JusticeFirmApi",
	endpoints: {
		registerLawyer: endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer",
			requestBodyChecker:  lazyCheck(RegisterLawyerInput),
			responseBodyChecker: lazyCheck(AuthToken),
		}),
		registerClient: endpoint({
			method:              HttpMethods.POST,
			path:                "/user/client",
			requestBodyChecker:  lazyCheck(RegisterClientInput),
			responseBodyChecker: lazyCheck(AuthToken),
		}),
		sessionLogin:   endpoint({
			method:              HttpMethods.POST,
			path:                "/session",
			requestBodyChecker:  lazyCheck(SessionLoginInput),
			responseBodyChecker: lazyCheck(MessageOrAuthToken),
		}),
		searchLawyers:  endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/search",
			requestBodyChecker:  lazyCheck(SearchLawyersInput),
			responseBodyChecker: lazyCheck(LawyerSearchResults),
		}),
		getLawyer:      endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/get",
			requestBodyChecker:  lazyCheck(GetLawyerInput),
			responseBodyChecker: lazyCheck(Optional(LawyerSearchResult)),
		}),
		// test:           endpoint({
		// 	method:              HttpMethods.GET,
		// 	path:                "/test",
		// 	responseBodyChecker: lazyCheck(Message)
		// })
	}
});
