import {Type} from "@sinclair/typebox";
import {CaseType} from "../db-types";

export const badFileNameChars = /[^a-zA-Z0-9.]/g;
export const emailRegex       = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
export const phoneRegex       = /^[0-9]{3}([-\s]?)[0-9]{3}([-\s]?)[0-9]{4}$/;
export const maxFileSize      = "2 MB";
export const maxDataUrlLen    = 3100000; // A bit more than 2048 kb

export const ValidPassword = Type.String({minLength: 8});
export const ValidEmail    = Type.RegEx(emailRegex);
export const ValidPhone    = Type.RegEx(phoneRegex);

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
