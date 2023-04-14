import {
	ArrayOptions,
	ObjectOptions,
	ObjectPropertyKeys,
	SchemaOptions,
	TObject,
	TOmit,
	TSchema,
	Type
} from "@sinclair/typebox";
import {genderDbValsToHuman, genderHumanValsToDb} from "./constants";
import {GeolocationNotAvailableError} from "./errors";
import {memoizeWeak} from "./memoizeWeak";
import {Nuly} from "./types";

export function isNullOrEmpty (s: string | Nuly): s is (null | "") {
	return s == null || s.length === 0;
}

export function nullOrEmptyCoalesce<T> (s: string | Nuly, s2: T) {
	return isNullOrEmpty(s) ? s2 : s;
}

export function trimStr (s: string, wordCount: number = 13): string {
	const words = s.split(/([^A-Za-z0-9]+)/g);
	if (words.length > wordCount)
		return words.slice(0, wordCount).join("") + "...";
	else return s;
}

export function dateStringFormat (s: string | Nuly): string | Nuly {
	return s == null ? null : new Date(s).toLocaleDateString(undefined, {
		day:     "numeric",
		weekday: "short",
		month:   "short",
		year:    "numeric",
		hour:    "2-digit",
		minute:  "2-digit",
		second:  "2-digit",
	});
}

export function dateFormat (d: Date | Nuly): string | Nuly {
	return d?.toLocaleDateString(undefined, {
		day:     "numeric",
		weekday: "short",
		month:   "short",
		year:    "numeric",
		hour:    "2-digit",
		minute:  "2-digit",
		second:  "2-digit",
	});
}

export function timeFormat (d: Date | Nuly): string | Nuly {
	return d?.toLocaleTimeString(undefined, {
		hour:   "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function getDateTimeHeader (d: Date) {
	const res = d.toLocaleDateString(undefined, {
		day:     "numeric",
		weekday: "long",
		month:   "long",
		year:    "numeric",
	});
	if ((new Date(d)).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
		return "(Today) " + res;
	} else {
		return res;
	}
}

export function compareDates (a: Date | Nuly, b: Date | Nuly) {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	return a.getTime() - b.getTime();
}

export function closeToZero (n: number) {
	return Math.abs(n) <= 0.0000001;
}

export function capitalizeFirstLetter (string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function firstIfArray<T> (val: T | T[]) {
	if (Array.isArray(val)) return val[0];
	return val;
}

export function toNumIfNotNull<T> (val: Nuly | any) {
	if (val == null) return null;
	return Number(val);
}

export const ArrayOf = memoizeWeak(function ArrayOf<TS extends TSchema> (schema: TS, options?: ArrayOptions) {
	return Type.Array(schema, {
		$id: `ArrayOf${schema.$id}`,
		...options
	});
});

export const InputOmit = memoizeWeak(function InputOmit<T extends TObject, K extends ObjectPropertyKeys<T>[]> (schema: T, keys: readonly [...K], options?: ObjectOptions): TOmit<T, K> {
	return Type.Omit(schema, keys, {
		$id: `${schema.$id}Input`,
		...options
	});
});

export const Optional = memoizeWeak(function Optional<T extends TSchema> (item: T, options?: SchemaOptions) {
	return Type.Optional(Type.Union([item, Type.Null(), Type.Undefined()], {
		$id: `Optional${item.$id}`,
		...options
	}));
});

export const PartialObject = memoizeWeak(function PartialObject<T extends TObject, K extends ObjectPropertyKeys<T>[]> (schema: T, options?: ObjectOptions) {
	return Type.Partial(schema, {
		$id: `Partial${schema.$id}`,
		...options
	});
});

export async function getCurrentPosition (options?: PositionOptions) {
	return new Promise<GeolocationPosition>((resolve, reject) => {
		if (navigator.geolocation) {
			console.log(navigator.geolocation);
			navigator.geolocation.getCurrentPosition(resolve, reject, options);
		} else {
			reject(new GeolocationNotAvailableError());
		}
	})
}

export function getDayFromMs (ms: number) {
	const seconds = (ms / 1000) | 0;
	const minutes = (seconds / 60) | 0;
	const hours   = (minutes / 60) | 0;
	return (hours / 24) | 0;
}

export function genderHumanToDB (h: string | Nuly) {
	return genderHumanValsToDb[h as keyof typeof genderHumanValsToDb] ?? genderHumanValsToDb.Unknown
}

export function genderDBToHuman (h: string | Nuly) {
	return genderDbValsToHuman[h as keyof typeof genderDbValsToHuman] ?? genderDbValsToHuman.unknown
}
