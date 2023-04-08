import {Type} from "@sinclair/typebox";
import {Optional} from "./functions";

export const Nuly              = Type.Union([Type.Null(), Type.Undefined()], {$id: "NullOrUndef"});
export const String_T          = Type.String({$id: "String"});
export const Boolean_T         = Type.Boolean({$id: "Boolean"});
export const Number_T          = Type.Number({$id: "Number"});
export const OptionalString_T  = Optional(String_T);
export const OptionalBoolean_T = Optional(Boolean_T);

export type Nuly = null | undefined;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export type PromiseOr<T> = Promise<T> | T;
