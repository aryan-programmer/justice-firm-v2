import {justiceFirmApiSchema} from "../common/rest-api-schema";
import {jfChatterBoxApiSchema} from "../common/ws-api-schema";
import {awsLambdaFunnelWrapper} from "../singularity/model.server";
import {awsWSLambdaFunnelWrapper} from "../singularity/websocket/ws-model.server";
import {JusticeFirmWsRestAPIImpl} from "./ws-rest-api-impl";

export function jfApiAwsFunnelFunctions () {
	const obj = new JusticeFirmWsRestAPIImpl();
	return {
		restApiImpl: awsLambdaFunnelWrapper(justiceFirmApiSchema, obj, {
			validateOutputs: false
		}),
		wsApiImpl:   awsWSLambdaFunnelWrapper(jfChatterBoxApiSchema, obj, {
			validateOutputs: false,
		}),
	};
}
