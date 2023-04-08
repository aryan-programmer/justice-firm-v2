import {APIGatewayProxyResult} from "aws-lambda";
import {APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {assert} from "../../common/utils/asserts";
import {Nuly} from "../../common/utils/types";
import {APIEndpoints, Endpoint, EndpointSchema} from "../endpoint";
import {lazyCheck, Message, MessageOr} from "../helpers";
import {HttpMethods} from "../httpMethods";
import {APIModelSchema} from "../schema";
import {CheckerFunction} from "../types";

/**
 * Supports a custom body return type, wrapped with {@link JSON.stringify} by default.
 * Works with Lambda Proxy Integration for Rest API or HTTP API integration Payload Format version 1.0
 * @see - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
 * @see {APIGatewayProxyResult} Derived from
 */
export interface WSEndpointResult<TResponseBody> {
	statusCode: number;
	body: TResponseBody;
	headers?: {
		          [header: string]: boolean | number | string;
	          } | undefined;
	isBase64Encoded?: boolean | undefined;
	cookies?: string[] | undefined;
}

export type PromiseOrWSEndpointResult<TResponseBody> =
	| WSEndpointResult<TResponseBody>
	| Promise<WSEndpointResult<TResponseBody>>;

export interface WSFnParams<TRequestBody> {
	body: TRequestBody
}

export type WSAPIImplementation<TSchema> = TSchema extends WSAPIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TReqBody, infer TResBody> ?
	                (params: WSFnParams<TReqBody>, event: APIGatewayProxyWebsocketEventV2) => PromiseOrWSEndpointResult<TResBody>
	                                                                            : never;
} : never;

export type WSAPIAwsLambdaWrapper<TSchema> = TSchema extends WSAPIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TReqBody, infer TResBody> ?
	                (event: APIGatewayProxyWebsocketEventV2) => Promise<APIGatewayProxyStructuredResultV2>
	                                                                            : never;
} : never;

export type WSAPIAwsFunnelWrapper = Record<string,
	(event: APIGatewayProxyWebsocketEventV2) => Promise<APIGatewayProxyStructuredResultV2>>;

export interface WSEvents {
	[v: string]: CheckerFunction<unknown>
}

export interface WSAPIModelSchema<TEndpoints extends APIEndpoints = APIEndpoints, TEvents extends WSEvents = WSEvents> extends APIModelSchema<TEndpoints> {
	events: TEvents
}

export type WSEventsSender<TEvents> = {
	[T in keyof TEvents]: TEvents[T] extends CheckerFunction<infer TEventBody> ? (v: TEventBody, connId: string) => void : never;
};

export function wsModelSchema<T extends APIEndpoints,
	TEv extends WSEvents> (val: { name: string, endpoints: T, events: TEv }): WSAPIModelSchema<T, TEv> {
	for (const endpointKey of Object.keys(val.endpoints)) {
		const endpoint = val.endpoints[endpointKey];
		assert(endpoint.path === endpointKey, () => `The websocket endpoint name and endpoint path do not match for the endpoint: 
${JSON.stringify(endpointKey)}: wsEndpoint(${JSON.stringify({
			path:                endpoint.path,
			method:              endpoint.method,
			requestBodyChecker:  endpoint.requestBodyChecker?.typeName,
			responseBodyChecker: endpoint.responseBodyChecker?.typeName,
		}, null, 4)})`);
		assert(endpoint.method === HttpMethods.WS_SEND,
			`The websocket endpoint (${endpointKey}) must have it's method be WS_SEND`);
	}
	return val;
}

const defaultResponseBodyChecker = lazyCheck(MessageOr(Nuly));

export function wsEndpoint<TReqBody> (end: {
	path: string;
	requestBodyChecker: CheckerFunction<TReqBody>;
}): Endpoint<TReqBody, Message | Nuly>

export function wsEndpoint<TReqBody, TResBody> (end: {
	path: string;
	requestBodyChecker: CheckerFunction<TReqBody>;
	responseBodyChecker: CheckerFunction<TResBody>;
}): Endpoint<TReqBody, TResBody>

export function wsEndpoint<TReqBody, TResBody> (end: {
	                                                     path: string;
	                                                     requestBodyChecker: CheckerFunction<TReqBody>;
	                                                     responseBodyChecker: CheckerFunction<TResBody>;
                                                     } | {
	                                                     path: string;
	                                                     requestBodyChecker: CheckerFunction<TReqBody>;
                                                     }): Endpoint<TReqBody, TResBody> {
	return new Endpoint({
		method:              HttpMethods.WS_SEND,
		responseBodyChecker: defaultResponseBodyChecker,
		...end
	});
}

export const WS_SEND_REQUEST_ID       = "__WS_SEND_REQUEST_ID__";
export const WS_RESPONSE_EVENT_PREFIX = "response:";
