import {Type} from "@sinclair/typebox";
import {maxDataUrlLen} from "./constants";
import {Optional} from "./functions";

export const Nuly              = Type.Union([Type.Null(), Type.Undefined()], {$id: "NullOrUndef"});
export const String_T          = Type.String({$id: "String"});
export const Boolean_T         = Type.Boolean({$id: "Boolean"});
export const Number_T          = Type.Number({$id: "Number"});
export const OptionalString_T  = Optional(String_T);
export const OptionalBoolean_T = Optional(Boolean_T);
export const DataUrl_T         = Type.String({maxLength: maxDataUrlLen, $id: "DataUrl"});

export type Nuly = null | undefined;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export type PromiseOr<T> = Promise<T> | T;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]];

export type Join<K, P> = K extends string | number ?
                         P extends string | number ?
                         `${K}${"" extends P ? "" : "."}${P}`
                                                   : never : never;
export type Paths<T, D extends number = 10> =
	[D] extends [never] ? never :
	T extends object ?
	{
		[K in keyof T]-?: K extends string | number ?
		                  `${K}` | Join<K, Paths<T[K], Prev[D]>>
		                                            : never
	}[keyof T] : ""

type Leaves<T, D extends number = 10> =
	[D] extends [never] ? never :
	T extends object ?
	{ [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T] : "";
