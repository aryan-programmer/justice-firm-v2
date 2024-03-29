import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {pq} from "~~/src/server/common/background-promise-queue";
import {HttpMethods} from "../../singularity/httpMethods";

import {jfApiAwsFunnelFunctions} from "./api-impl";

const {restApiImpl, wsChatterBoxApiImpl, dbModelMethods} = jfApiAwsFunnelFunctions();
dbModelMethods.getPool().then((v) => console.log("Got pool: ", v));

async function handlerBase (event: APIGatewayProxyEvent | APIGatewayProxyWebsocketEventV2):
	Promise<APIGatewayProxyResult | APIGatewayProxyStructuredResultV2> {
	// console.log("handler:", event, process.env);
	if ("resource" in event) {
		const resource = restApiImpl?.[event.resource];
		if (resource == null) {
			return {
				statusCode: 404,
				body:       `{"message": "The resource ${event.resource} is not supported."}`,
			};
		}
		const fn = resource?.[event.httpMethod as HttpMethods];
		if (fn == null) {
			return {
				statusCode: 404,
				body:       `{"message": "The method ${event.httpMethod} is not supported on the resource ${event.resource}"}`,
			};
		}
		return await fn(event);
	}
	const ev       = event as APIGatewayProxyWebsocketEventV2;
	const routeKey = ev.requestContext.routeKey;
	const resource = wsChatterBoxApiImpl?.[routeKey];
	if (resource == null) {
		return {
			statusCode: 404,
			body:       `{"message": "The route key ${routeKey} is not supported for the websocket Chat Messaging (Chatter Box) API."}`,
		};
	}
	return await resource(ev);
}


export async function handler (event: APIGatewayProxyEvent | APIGatewayProxyWebsocketEventV2):
	Promise<APIGatewayProxyResult | APIGatewayProxyStructuredResultV2> {
	const res = await handlerBase(event);
	await pq.waitForAll();
	return res;
}
