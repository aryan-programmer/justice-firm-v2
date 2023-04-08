import {justiceFirmApiSchema} from "../../common/rest-api-schema";
import {jfChatterBoxApiSchema} from "../../common/ws-api-schema";
import {fetchImplementation} from "../../singularity/model.client";
import {websocketClient} from "../../singularity/websocket/ws-model.client";

export const justiceFirmApi = fetchImplementation(justiceFirmApiSchema, {
	baseUrl:         "https://8zlzg1t13g.execute-api.ap-south-1.amazonaws.com/prod",
	validateInputs:  true,
	validateOutputs: true,
});
// @ts-ignore
window.justiceFirmApi       = justiceFirmApi;

export const ChatWSAPIClient = websocketClient(jfChatterBoxApiSchema, {
	baseUrl:            "wss://kw9a1l70q3.execute-api.ap-south-1.amazonaws.com/prod",
	validateInputs:     true,
	validateOutputs:    true,
	validateEventsData: true,
});
// @ts-ignore
window.ChatWSAPIClient       = ChatWSAPIClient;
export type ChatWSAPIClient = InstanceType<typeof ChatWSAPIClient>;
