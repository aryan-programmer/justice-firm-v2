import {Static, Type} from "@sinclair/typebox";
import {FileUploadToken} from "../server/utils/types";
import {endpoint} from "../singularity/endpoint";
import {lazyCheck, MessageOr} from "../singularity/helpers";
import {HttpMethods} from "../singularity/httpMethods";
import {modelSchema} from "../singularity/schema";
import {AdminAuthToken, AuthToken, ClientAuthToken, LawyerAuthToken} from "./api-types";
import {
	CaseDocumentData,
	CaseStatusEnum_T,
	CaseType,
	Client,
	ClientDataResult,
	ID_T,
	Lawyer,
	LawyerSearchResult,
	StatusEnum,
	StatusEnum_T,
	StatusSearchOptions
} from "./db-types";
import {ValidEmail, ValidOTP, ValidPassword} from "./utils/constants";
import {ArrayOf, Optional} from "./utils/functions";
import {DataUrl_T, Nuly, Number_T, OptionalBoolean_T, OptionalString_T, String_T} from "./utils/types";

export {ClientDataResult, LawyerSearchResult} from "./db-types";

export const RegisterLawyerInput = Type.Intersect([
	Type.Omit(Lawyer, ["id", "photoPath", "type", "certificationLink", "status", "passwordHash"]),
	Type.Object({
		password:            ValidPassword,
		photoData:           DataUrl_T,
		certificationData:   DataUrl_T,
		specializationTypes: Type.Array(ID_T),
	})
], {$id: "RegisterLawyerInput"});
export type RegisterLawyerInput = Static<typeof RegisterLawyerInput>;

export const RegisterClientInput = Type.Intersect([
	Type.Omit(Client, ["id", "photoPath", "type", "passwordHash"]),
	Type.Object({
		password:  ValidPassword,
		photoData: DataUrl_T,
	})
], {$id: "RegisterClientInput"});
export type RegisterClientInput = Static<typeof RegisterClientInput>;

export const UpdateProfileInput = Type.Intersect([
	Type.Omit(Client, ["photoPath", "id", "email", "type", "passwordHash"]),
	Type.Object({
		authToken:   AuthToken,
		newPassword: Optional(ValidPassword),
		photoData:   Optional(DataUrl_T),
	})
], {$id: "UpdateProfileInput"});
export type UpdateProfileInput = Static<typeof UpdateProfileInput>;

export const UpdateLawyerProfileInput = Type.Intersect([
	Type.Omit(Lawyer, ["id", "email", "photoPath", "type", "certificationLink", "status", "passwordHash"]),
	Type.Object({
		authToken:           AuthToken,
		newPassword:         Optional(ValidPassword),
		photoData:           Optional(DataUrl_T),
		certificationData:   Optional(DataUrl_T),
		specializationTypes: Optional(ArrayOf(ID_T)),
	})
], {$id: "UpdateLawyerProfileInput"});
export type UpdateLawyerProfileInput = Static<typeof UpdateLawyerProfileInput>;

export const GetSelfProfileInput = Type.Object({
	authToken: AuthToken
}, {$id: "GetSelfProfileInput"});
export type GetSelfProfileInput = Static<typeof GetSelfProfileInput>;

export const GetSelfProfileOutput = Type.Union([ClientDataResult, LawyerSearchResult], {$id: "GetSelfProfileOutput"});
export type GetSelfProfileOutput = Static<typeof GetSelfProfileOutput>;

export const SessionLoginInput = Type.Object({
	email:    ValidEmail,
	password: ValidPassword,
}, {$id: "SessionLoginInput"});
export type SessionLoginInput = Static<typeof SessionLoginInput>;

export const MessageOrAuthToken = MessageOr(AuthToken);

export const SearchLawyersBaseInput = Type.Partial(Type.Object({
	name:    String_T,
	email:   String_T,
	address: String_T,
}), {$id: "SearchLawyersBaseInput"});
export type SearchLawyersBaseInput = Static<typeof SearchLawyersBaseInput>;

const LawyerSearchResults = ArrayOf(LawyerSearchResult);

export const SearchAndSortLawyersInput = Type.Partial(Type.Object({
	name:      String_T,
	email:     String_T,
	address:   String_T,
	latitude:  Number_T,
	longitude: Number_T,
}), {$id: "SearchAndSortLawyersInput"});
export type SearchAndSortLawyersInput = Static<typeof SearchAndSortLawyersInput>;

export const SearchLawyersInput = Type.Union([SearchLawyersBaseInput, SearchAndSortLawyersInput],
	{$id: "SearchLawyersInput"});
export type SearchLawyersInput = SearchLawyersBaseInput | SearchAndSortLawyersInput;

export const GetLawyerInput = Type.Object({
	id:                     ID_T,
	authToken:              Optional(AuthToken),
	getStatistics:          OptionalBoolean_T,
	getBareCases:           OptionalBoolean_T,
	getBareAppointments:    OptionalBoolean_T,
	getCaseSpecializations: OptionalBoolean_T,
}, {$id: "GetLawyerInput"});
export type GetLawyerInput = Static<typeof GetLawyerInput>;

export const GetLawyerStatusInput = Type.Object({
	id: ID_T,
}, {$id: "GetLawyerStatusInput"});
export type GetLawyerStatusInput = Static<typeof GetLawyerStatusInput>;

export const GetLawyerStatusOutput = Type.Object({
	status:          StatusEnum_T,
	rejectionReason: OptionalString_T,
}, {$id: "GetLawyerStatusOutput"});
export type GetLawyerStatusOutput = Static<typeof GetLawyerStatusOutput>;

export const OpenAppointmentRequestInput = Type.Object({
	lawyerId:    ID_T,
	authToken:   ClientAuthToken,
	description: String_T,
	timestamp:   OptionalString_T
}, {$id: "OpenAppointmentRequestInput"});
export type OpenAppointmentRequestInput = Static<typeof OpenAppointmentRequestInput>;

export const GetAppointmentsInput = Type.Object({
	authToken:       AuthToken,
	withStatus:      StatusEnum_T,
	orderByOpenedOn: OptionalBoolean_T
}, {$id: "GetAppointmentsInput"});
export type GetAppointmentsInput = Static<typeof GetAppointmentsInput>;

export const AppointmentSparseData = Type.Object({
	id:          ID_T,
	othId:       ID_T,
	othName:     String_T,
	caseId:      Optional(ID_T),
	groupId:     ID_T,
	description: String_T,
	timestamp:   OptionalString_T,
	openedOn:    String_T,
}, {$id: "AppointmentSparseData"});
export type AppointmentSparseData = Static<typeof AppointmentSparseData>;

export const GetWaitingLawyersInput = Type.Object({
	authToken: AdminAuthToken,
}, {$id: "GetWaitingLawyersInput"});
export type GetWaitingLawyersInput = Static<typeof GetWaitingLawyersInput>;

export const SearchAllLawyersBaseInput = Type.Object({
	authToken: AdminAuthToken,
	status:    StatusSearchOptions,
}, {$id: "SearchAllLawyersBaseInput"});
export type SearchAllLawyersBaseInput = Static<typeof SearchAllLawyersBaseInput>;

export const SearchAllLawyersInput = Type.Union([
		Type.Intersect([SearchLawyersBaseInput, SearchAllLawyersBaseInput]),
		Type.Intersect([SearchAndSortLawyersInput, SearchAllLawyersBaseInput]),
	],
	{$id: "SearchAllLawyersInput"});
export type SearchAllLawyersInput =
	| (SearchLawyersBaseInput & SearchAllLawyersBaseInput)
	| (SearchAndSortLawyersInput & SearchAllLawyersBaseInput);

export const SetLawyerStatusesInput = Type.Object({
	authToken: AdminAuthToken,
	confirmed: ArrayOf(ID_T),
	rejected:  ArrayOf(Type.Object({
		id:     ID_T,
		reason: String_T
	})),
	waiting:   ArrayOf(ID_T),
}, {$id: "SetLawyerStatusesInput"});
export type SetLawyerStatusesInput = Static<typeof SetLawyerStatusesInput>;

export const GetByIdInput = Type.Object({
	authToken: AuthToken,
	id:        ID_T,
}, {$id: "GetByIdInput"});
export type GetByIdInput = Static<typeof GetByIdInput>;

export const AppointmentFullData = Type.Object({
	id:          ID_T,
	client:      ClientDataResult,
	lawyer:      LawyerSearchResult,
	caseId:      Optional(ID_T),
	groupId:     ID_T,
	description: String_T,
	timestamp:   OptionalString_T,
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
		timestamp:     OptionalString_T
	})
], {$id: "SetAppointmentStatusInput"});
export type SetAppointmentStatusInput = Static<typeof SetAppointmentStatusInput>;

export const UpgradeAppointmentToCaseInput = Type.Object({
	authToken:     LawyerAuthToken,
	appointmentId: ID_T,
	description:   OptionalString_T,
	groupName:     OptionalString_T,
	type:          ID_T,
	status:        Optional(CaseStatusEnum_T),
}, {$id: "UpgradeAppointmentToCaseInput"});
export type UpgradeAppointmentToCaseInput = Static<typeof UpgradeAppointmentToCaseInput>;

export const CaseFullData = Type.Object({
	id:          ID_T,
	client:      ClientDataResult,
	lawyer:      LawyerSearchResult,
	caseType:    CaseType,
	groupId:     ID_T,
	description: String_T,
	openedOn:    String_T,
	status:      CaseStatusEnum_T,
}, {$id: "CaseFullData"});
export type CaseFullData = Static<typeof CaseFullData>;

export const GetCasesDataInput = Type.Object({
	authToken: AuthToken,
}, {$id: "GetCasesDataInput"});
export type GetCasesDataInput = Static<typeof GetCasesDataInput>;

export const CaseSparseData = Type.Object({
	id:          ID_T,
	othId:       ID_T,
	othName:     String_T,
	caseType:    CaseType,
	groupId:     ID_T,
	description: String_T,
	openedOn:    String_T,
	status:      CaseStatusEnum_T,
}, {$id: "CaseSparseData"});
export type CaseSparseData = Static<typeof CaseSparseData>;

export const SendPasswordResetOTPInput = Type.Object({
	email: ValidEmail
}, {$id: "SendPasswordResetOTPInput"});
export type SendPasswordResetOTPInput = Static<typeof SendPasswordResetOTPInput>;

export const ResetPasswordInput = Type.Object({
	email:    ValidEmail,
	password: ValidPassword,
	otp:      ValidOTP
}, {$id: "ResetPasswordInput"});
export type ResetPasswordInput = Static<typeof ResetPasswordInput>;

export const UploadFileInput = Type.Object({
	authToken:  AuthToken,
	fileData:   DataUrl_T,
	fileName:   String_T,
	pathPrefix: Type.String({maxLength: 64})
}, {$id: "UploadFileInput"});
export type UploadFileInput = Static<typeof UploadFileInput>;

export const AddCaseDocumentInput = Type.Object({
	authToken:   AuthToken,
	caseId:      ID_T,
	file:        FileUploadToken,
	description: String_T,
}, {$id: "AddCaseDocumentInput"});
export type AddCaseDocumentInput = Static<typeof AddCaseDocumentInput>;

export const GetCaseDocumentsInput = Type.Object({
	authToken: AuthToken,
	caseId:    ID_T,
}, {$id: "AddCaseDocumentInput"});
export type GetCaseDocumentsInput = Static<typeof GetCaseDocumentsInput>;

export const justiceFirmApiSchema = modelSchema({
	name:      "JusticeFirmApi",
	endpoints: {
		registerLawyer:             endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer",
			requestBodyChecker:  lazyCheck(RegisterLawyerInput),
			responseBodyChecker: lazyCheck(MessageOr(LawyerAuthToken)),
		}),
		registerClient:             endpoint({
			method:              HttpMethods.POST,
			path:                "/user/client",
			requestBodyChecker:  lazyCheck(RegisterClientInput),
			responseBodyChecker: lazyCheck(MessageOr(ClientAuthToken)),
		}),
		getSelfProfile:             endpoint({
			method:              HttpMethods.POST,
			path:                "/user/profile/get-self",
			requestBodyChecker:  lazyCheck(GetSelfProfileInput),
			responseBodyChecker: lazyCheck(MessageOr(GetSelfProfileOutput)),
		}),
		updateProfile:              endpoint({
			method:              HttpMethods.POST,
			path:                "/user/profile/update",
			requestBodyChecker:  lazyCheck(UpdateProfileInput),
			responseBodyChecker: lazyCheck(MessageOr(AuthToken)),
		}),
		updateLawyerProfile:        endpoint({
			method:              HttpMethods.POST,
			path:                "/user/profile/update-lawyer",
			requestBodyChecker:  lazyCheck(UpdateLawyerProfileInput),
			responseBodyChecker: lazyCheck(MessageOr(LawyerAuthToken)),
		}),
		sessionLogin:               endpoint({
			method:              HttpMethods.POST,
			path:                "/session",
			requestBodyChecker:  lazyCheck(SessionLoginInput),
			responseBodyChecker: lazyCheck(MessageOrAuthToken),
		}),
		searchLawyers:              endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/search",
			requestBodyChecker:  lazyCheck(SearchLawyersInput),
			responseBodyChecker: lazyCheck(LawyerSearchResults),
		}),
		searchAllLawyers:           endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/search-all",
			requestBodyChecker:  lazyCheck(SearchAllLawyersInput),
			responseBodyChecker: lazyCheck(MessageOr(LawyerSearchResults)),
		}),
		getLawyer:                  endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/get",
			requestBodyChecker:  lazyCheck(GetLawyerInput),
			responseBodyChecker: lazyCheck(MessageOr(LawyerSearchResult)),
		}),
		getLawyerStatusInformation: endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/get-status",
			requestBodyChecker:  lazyCheck(GetLawyerStatusInput),
			responseBodyChecker: lazyCheck(MessageOr(GetLawyerStatusOutput)),
		}),
		setLawyerStatuses:          endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer/set-status",
			requestBodyChecker:  lazyCheck(SetLawyerStatusesInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly)),
		}),
		openAppointmentRequest:     endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/new",
			requestBodyChecker:  lazyCheck(OpenAppointmentRequestInput),
			responseBodyChecker: lazyCheck(MessageOr(ID_T)),
		}),
		getAppointments:            endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/get/by-status",
			requestBodyChecker:  lazyCheck(GetAppointmentsInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(AppointmentSparseData)))
		}),
		getAppointmentRequest:      endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/get/by-id",
			requestBodyChecker:  lazyCheck(GetByIdInput),
			responseBodyChecker: lazyCheck(MessageOr(Optional(AppointmentFullData)))
		}),
		setAppointmentStatus:       endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/set/status",
			requestBodyChecker:  lazyCheck(SetAppointmentStatusInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly))
		}),
		upgradeAppointmentToCase:   endpoint({
			method:              HttpMethods.POST,
			path:                "/appointment/upgrade-to-case",
			requestBodyChecker:  lazyCheck(UpgradeAppointmentToCaseInput),
			responseBodyChecker: lazyCheck(MessageOr(ID_T))
		}),
		getCasesData:               endpoint({
			method:              HttpMethods.POST,
			path:                "/cases/get",
			requestBodyChecker:  lazyCheck(GetCasesDataInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(CaseSparseData)))
		}),
		getCase:                    endpoint({
			method:              HttpMethods.POST,
			path:                "/case/get/by-id",
			requestBodyChecker:  lazyCheck(GetByIdInput),
			responseBodyChecker: lazyCheck(MessageOr(CaseFullData))
		}),
		sendPasswordResetOTP:       endpoint({
			method:              HttpMethods.POST,
			path:                "/user/send-password-reset-otp",
			requestBodyChecker:  lazyCheck(SendPasswordResetOTPInput),
			responseBodyChecker: lazyCheck(MessageOr(Nuly))
		}),
		resetPassword:              endpoint({
			method:              HttpMethods.POST,
			path:                "/user/reset-password",
			requestBodyChecker:  lazyCheck(ResetPasswordInput),
			responseBodyChecker: lazyCheck(MessageOr(AuthToken))
		}),
		uploadFile:                 endpoint({
			method:              HttpMethods.POST,
			path:                "/upload-file",
			requestBodyChecker:  lazyCheck(UploadFileInput),
			responseBodyChecker: lazyCheck(MessageOr(FileUploadToken))
		}),
		addCaseDocument:            endpoint({
			method:              HttpMethods.POST,
			path:                "/case/documents/add",
			requestBodyChecker:  lazyCheck(AddCaseDocumentInput),
			responseBodyChecker: lazyCheck(MessageOr(ID_T))
		}),
		getCaseDocuments:           endpoint({
			method:              HttpMethods.POST,
			path:                "/case/documents",
			requestBodyChecker:  lazyCheck(GetCaseDocumentsInput),
			responseBodyChecker: lazyCheck(MessageOr(ArrayOf(CaseDocumentData)))
		}),
	}
});
