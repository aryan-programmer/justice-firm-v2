import {Static, Type} from "@sinclair/typebox";
import {endpoint} from "../singularity/endpoint";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {HttpMethods} from "../singularity/httpMethods";
import {modelSchema} from "../singularity/schema";
import {AdminAuthToken, AuthToken, ClientAuthToken, LawyerAuthToken} from "./api-types";
import {Client, ID_T, Lawyer, StatusEnum, StatusEnum_T} from "./db-types";
import {maxDataUrlLen, ValidEmail, ValidPassword} from "./utils/constants";
import {ArrayOf, Optional} from "./utils/functions";
import {Nuly, String_T} from "./utils/types";

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
	name:    String_T,
	address: String_T,
}), {$id: "SearchLawyersBaseInput"});
export type SearchLawyersBaseInput = Static<typeof SearchLawyersBaseInput>;

const LawyerSearchResult = Type.Intersect([
	Type.Omit(Lawyer, ["type", "passwordHash", "status"]),
	Type.Object({
		distance: Optional(Type.Number()),
	})
], {$id: "LawyerSearchResult"});
export type LawyerSearchResult = Omit<Lawyer, "type" | "passwordHash" | "status"> & { distance: number | Nuly };
const LawyerSearchResults = ArrayOf(LawyerSearchResult);

export const SearchAndSortLawyersInput = Type.Partial(Type.Object({
	name:      String_T,
	address:   String_T,
	latitude:  Type.Number(),
	longitude: Type.Number(),
}), {$id: "SearchAndSortLawyersInput"});
export type SearchAndSortLawyersInput = Static<typeof SearchAndSortLawyersInput>;

export const SearchLawyersInput = Type.Union([SearchLawyersBaseInput, SearchAndSortLawyersInput],
	{$id: "SearchLawyersInput"});
export type SearchLawyersInput = SearchLawyersBaseInput | SearchAndSortLawyersInput;

export const GetLawyerInput = Type.Object({id: ID_T}, {$id: "GetLawyerInput"});
export type GetLawyerInput = Pick<Lawyer, "id">;

export const OpenAppointmentRequestInput = Type.Object({
	lawyerId:    ID_T,
	authToken:   ClientAuthToken,
	description: String_T,
	timestamp:   Type.Optional(String_T)
}, {$id: "OpenAppointmentRequestInput"});
export type OpenAppointmentRequestInput = Static<typeof OpenAppointmentRequestInput>;

export const GetAppointmentsInput = Type.Object({
	authToken:       AuthToken,
	withStatus:      StatusEnum_T,
	orderByOpenedOn: Optional(Type.Boolean())
}, {$id: "GetAppointmentsInput"});
export type GetAppointmentsInput = Static<typeof GetAppointmentsInput>;

export const AppointmentSparseData = Type.Object({
	id:          ID_T,
	othId:       ID_T,
	othName:     String_T,
	caseId:      Optional(ID_T),
	groupId:     ID_T,
	description: String_T,
	timestamp:   Optional(String_T),
	openedOn:    String_T,
}, {$id: "AppointmentSparseData"});
export type AppointmentSparseData = Static<typeof AppointmentSparseData>;

export const GetWaitingLawyersInput = Type.Object({
	authToken: AdminAuthToken,
}, {$id: "GetWaitingLawyersInput"});
export type GetWaitingLawyersInput = Static<typeof GetWaitingLawyersInput>;

export const SetLawyerStatusesInput = Type.Object({
	authToken: AdminAuthToken,
	confirmed: ArrayOf(ID_T),
	rejected:  ArrayOf(ID_T),
}, {$id: "SetLawyerStatusesInput"});
export type SetLawyerStatusesInput = Static<typeof SetLawyerStatusesInput>;

export const GetAppointmentByIdInput = Type.Object({
	authToken: AuthToken,
	id:        ID_T,
}, {$id: "GetAppointmentByIdInput"});
export type GetAppointmentByIdInput = Static<typeof GetAppointmentByIdInput>;

const ClientDataResult = Type.Omit(Client, ["type", "passwordHash"], {$id: "ClientDataResult"});
export type ClientDataResult = Omit<Client, "type" | "passwordHash">;

export const AppointmentFullData = Type.Object({
	id:          ID_T,
	client:      ClientDataResult,
	lawyer:      LawyerSearchResult,
	caseId:      Optional(ID_T),
	groupId:     ID_T,
	description: String_T,
	timestamp:   Optional(String_T),
	openedOn:    String_T,
	status:      StatusEnum_T,
}, {$id: "AppointmentFullData"});
export type AppointmentFullData = Static<typeof AppointmentFullData>;

export const SetAppointmentStatusInput = Type.Union([
	Type.Object({
		authToken:     LawyerAuthToken,
		appointmentId: ID_T,
		status:        Type.Literal(StatusEnum.Rejected),
	}),
	Type.Object({
		authToken:     LawyerAuthToken,
		appointmentId: ID_T,
		status:        Type.Literal(StatusEnum.Confirmed),
		timestamp:     Optional(String_T)
	})
], {$id: "SetAppointmentStatusInput"});
export type SetAppointmentStatusInput = Static<typeof SetAppointmentStatusInput>;

export const justiceFirmApiSchema = modelSchema({
	name:      "JusticeFirmApi",
	endpoints: {
		registerLawyer:         endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer",
			requestBodyChecker:  lazyCheck(RegisterLawyerInput),
			responseBodyChecker: lazyCheck(AuthToken),
		}),
		registerClient:         endpoint({
			method:              HttpMethods.POST,
			path:                "/user/client",
			requestBodyChecker:  lazyCheck(RegisterClientInput),
			responseBodyChecker: lazyCheck(AuthToken),
		}),
		sessionLogin:           endpoint({
			method:              HttpMethods.POST,
			path:                "/session",
			requestBodyChecker:  lazyCheck(SessionLoginInput),
			responseBodyChecker: lazyCheck(MessageOrAuthToken),
		}),
		searchLawyers:          endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/search",
			requestBodyChecker:  lazyCheck(SearchLawyersInput),
			responseBodyChecker: lazyCheck(LawyerSearchResults),
		}),
		getWaitingLawyers:      endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/waiting",
			requestBodyChecker:  lazyCheck(GetWaitingLawyersInput),
			responseBodyChecker: lazyCheck(MessageOr(LawyerSearchResults))
		}),
		getLawyer:              endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/get",
			requestBodyChecker:  lazyCheck(GetLawyerInput),
			responseBodyChecker: lazyCheck(Optional(LawyerSearchResult)),
		}),
		setLawyerStatuses:      endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/set-status",
			requestBodyChecker:  lazyCheck(SetLawyerStatusesInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		openAppointmentRequest: endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/new",
			requestBodyChecker:  lazyCheck(OpenAppointmentRequestInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		getAppointments:        endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/get/by-status",
			requestBodyChecker:  lazyCheck(GetAppointmentsInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(AppointmentSparseData)))
		}),
		getAppointmentRequest:  endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/get/by-id",
			requestBodyChecker:  lazyCheck(GetAppointmentByIdInput),
			responseBodyChecker: lazyCheck(MessageOr(Optional(AppointmentFullData)))
		}),
		setAppointmentStatus:   endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/set/status",
			requestBodyChecker:  lazyCheck(SetAppointmentStatusInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly))
		})
		// test:           endpoint({
		// 	method:              HttpMethods.GET,
		// 	path:                "/test",
		// 	responseBodyChecker: lazyCheck(Message)
		// })
	}
});
