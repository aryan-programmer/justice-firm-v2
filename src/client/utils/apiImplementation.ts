import {justiceFirmApiSchema} from "../../common/api-schema";
import {fetchImplementation} from "../../singularity/model.client";

export const justiceFirmApi = fetchImplementation(justiceFirmApiSchema, {
	baseUrl: "https://8zlzg1t13g.execute-api.ap-south-1.amazonaws.com/prod"
});
// @ts-ignore
window.justiceFirmApi       = justiceFirmApi;
