import {Static, Type} from "@sinclair/typebox";
import {OptionalString_T, String_T} from "../../../common/utils/types";

export const FileUploadData = Type.Object({
	path: String_T,
	mime: String_T,
	name: OptionalString_T,
}, {$id: "FileUploadData"});
export type FileUploadData = Static<typeof FileUploadData>;

export const FileUploadToken = Type.Intersect([Type.Object({
	jwt: String_T,
})], {$id: "FileUploadToken"});
export type FileUploadToken = Static<typeof FileUploadToken>;
