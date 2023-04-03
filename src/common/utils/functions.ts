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
import {GeolocationNotAvailableError} from "./errors";
import {memoizeWeak} from "./memoizeWeak";
import {Nuly} from "./types";

export function nullOrEmpty (s: string | Nuly) {
	return s == null || s.length === 0;
}

export function nullOrEmptyCoalesce<T> (s: string | Nuly, s2: T) {
	return nullOrEmpty(s) ? s2 : s;
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
		$id: `Array_Of${schema.$id}`,
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
