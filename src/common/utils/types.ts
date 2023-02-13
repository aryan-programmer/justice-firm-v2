import {Type} from "@sinclair/typebox";

export const Nuly = Type.Union([Type.Null(), Type.Undefined()], {$id: "NullOrUndef"});
export type Nuly = null | undefined;
