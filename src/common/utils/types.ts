import {Type} from "@sinclair/typebox";

export const Nuly     = Type.Union([Type.Null(), Type.Undefined()], {$id: "NullOrUndef"});
export const String_T = Type.String({$id: "String"});
export type Nuly = null | undefined;
