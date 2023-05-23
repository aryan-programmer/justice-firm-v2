import {justiceFirmApiSchema} from "../common/rest-api-schema";
import {jfChatterBoxApiSchema} from "../common/ws-chatter-box-api-schema";
import {awsLambdaFunnelWrapper} from "../singularity/model.server";
import {awsWSLambdaFunnelWrapper} from "../singularity/websocket/ws-model.server";
import {CommonApiMethods} from "./common-api-methods";
import {DbModelMethods} from "./db-model-methods";
import {JusticeFirmRestAPIImpl} from "./rest-api-impl";
import {JusticeFirmWsChatterBoxAPIImpl} from "./ws-chatter-box-api-impl";

export function jfApiAwsFunnelFunctions () {
	const dbModelMethods = new DbModelMethods();
	const restAPIImpl = new JusticeFirmRestAPIImpl(dbModelMethods);
	const wsChatterBoxApiImpl = new JusticeFirmWsChatterBoxAPIImpl(dbModelMethods);
	return {
		restApiImpl: awsLambdaFunnelWrapper(justiceFirmApiSchema, restAPIImpl, {
			validateOutputs: false
		}),
		wsChatterBoxApiImpl:   awsWSLambdaFunnelWrapper(jfChatterBoxApiSchema, wsChatterBoxApiImpl, {
			validateOutputs: false,
		}),
	};
}
