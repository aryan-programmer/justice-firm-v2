import {Type} from "@sinclair/typebox";
import type {CaseType, StatusSearchOptions} from "../db-types";

export const badFileNameChars = /[^a-zA-Z0-9.]/g;
export const emailRegex       = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
export const phoneRegex       = /^(\+[1-9][0-9]{0,2}([-\s]?))?[0-9]{3}([-\s]?)[0-9]{3}([-\s]?)[0-9]{4}$/;
export const validOtpRegex    = /^[0-9]{6}$/g;
export const otpLength        = 6;
export const maxFileSize      = "2 MB";
export const maxDataUrlLen    = 3100000; // A bit more than 2048 kb

export const otpMinNum = +("1" + "0".repeat(otpLength - 1));
export const otpMaxNum = +("9".repeat(otpLength));

export const ValidPassword = Type.String({minLength: 8, $id: "ValidPassword"});
export const ValidEmail    = Type.RegEx(emailRegex, {$id: "ValidEmail"});
export const ValidPhone    = Type.RegEx(phoneRegex, {$id: "ValidPhone"});
export const ValidOTP      = Type.RegEx(validOtpRegex, {$id: "ValidOTP"});

export const validImageMimeTypes: string[] = [
	'image/jpeg',
	'image/png',
	'image/gif',
];
export const invalidImageMimeTypeMessage   = "Error: File must be a JPEG/JPG, PNG of GIF image";

export const genderDbValsToHuman = {
	"male":          "Male",
	"female":        "Female",
	"unknown":       "Unknown",
	"not-specified": "Prefer to not specify",
};
export const genderHumanValsToDb = {
	"Male":                  "male",
	"Female":                "female",
	"Unknown":               "unknown",
	"Prefer to not specify": "not-specified",
};
export const genderHumanVals     = Object.keys(genderHumanValsToDb);

export enum StatusSearchOptionsEnum {
	Any          = "any",
	NotConfirmed = 'not-confirmed',
	NotRejected  = 'not-rejected',
	NotWaiting   = 'not-waiting',
}

export enum StatusEnum {
	Waiting   = 'waiting',
	Rejected  = 'rejected',
	Confirmed = 'confirmed'
}

const statusSearchOptions: StatusSearchOptions[]                               = [
	StatusSearchOptionsEnum.Any,
	StatusEnum.Confirmed,
	StatusEnum.Waiting,
	StatusEnum.Rejected,
	StatusSearchOptionsEnum.NotRejected,
	StatusSearchOptionsEnum.NotConfirmed,
	StatusSearchOptionsEnum.NotWaiting,
];
export const statusSearchOptionsDbToHuman: Record<StatusSearchOptions, string> = {
	[StatusSearchOptionsEnum.Any]:          "Any",
	[StatusEnum.Confirmed]:                 "Confirmed",
	[StatusEnum.Waiting]:                   "Waiting",
	[StatusEnum.Rejected]:                  "Rejected",
	[StatusSearchOptionsEnum.NotRejected]:  "Not Rejected",
	[StatusSearchOptionsEnum.NotConfirmed]: "Not Confirmed",
	[StatusSearchOptionsEnum.NotWaiting]:   "Not Waiting",
};
export const statusSearchOptionsHumanValsToDb                                  = {
	"Any":           StatusSearchOptionsEnum.Any,
	"Confirmed":     StatusEnum.Confirmed,
	"Waiting":       StatusEnum.Waiting,
	"Rejected":      StatusEnum.Rejected,
	"Not Rejected":  StatusSearchOptionsEnum.NotRejected,
	"Not Confirmed": StatusSearchOptionsEnum.NotConfirmed,
	"Not Waiting":   StatusSearchOptionsEnum.NotWaiting,
};
export const statusSearchOptionHuman_Any                                       = "Any";

export const statusSearchOptionsHumanVals = Object.keys(statusSearchOptionsHumanValsToDb);

export function getCaseTypes (): CaseType[] {
	return [
		{id: "1", name: "Bankruptcy"},
		{id: "2", name: "Business/Corporate"},
		{id: "3", name: "Constitutional"},
		{id: "4", name: "Criminal Defense"},
		{id: "5", name: "Employment and Labor"},
		{id: "6", name: "Entertainment"},
		{id: "7", name: "Estate Planning"},
		{id: "8", name: "Family"},
		{id: "9", name: "Immigration"},
		{id: "10", name: "Intellectual Property"},
		{id: "11", name: "Personal Injury"},
		{id: "12", name: "Tax"}
	]
}

export function isIterable (input: any): input is Iterable<any> {
	return typeof (input?.[Symbol.iterator]) === "function";
}
