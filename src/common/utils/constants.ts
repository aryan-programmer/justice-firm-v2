import {CaseType} from "../db-types";

export const phoneRegex  = /^[0-9]{3}([-\s]?)[0-9]{3}([-\s]?)[0-9]{4}$/;
export const maxFileSize = 3000000; // A bit more than 2048 kb

export function getCaseTypes (): CaseType[] {
	return [
		{id: 1, type: "Bankruptcy"},
		{id: 2, type: "Business/Corporate"},
		{id: 3, type: "Constitutional"},
		{id: 4, type: "Criminal Defense"},
		{id: 5, type: "Employment and Labor"},
		{id: 6, type: "Entertainment"},
		{id: 7, type: "Estate Planning"},
		{id: 8, type: "Family"},
		{id: 9, type: "Immigration"},
		{id: 10, type: "Intellectual Property"},
		{id: 11, type: "Personal Injury"},
		{id: 12, type: "Tax"}
	]
}
