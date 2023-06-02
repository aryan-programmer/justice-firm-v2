import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";
import {HttpMethods} from "./httpMethods";
import {CheckerErrorsOrNully, CheckerFunction, TypeCheckError} from "./types";

export interface EndpointSchema<TReqBody, TResBody> {
	method: HttpMethods;
	path: string;
	requestBodyChecker?: CheckerFunction<TReqBody>;
	responseBodyChecker?: CheckerFunction<TResBody>;
}

type FilterNullish<T extends unknown[]> = T extends [] ? [] :
                                          T extends [infer H, ...infer R] ?
                                          H extends undefined | null | never | void ? FilterNullish<R> : [H, ...FilterNullish<R>] : T

export interface FnParams<TRequestBody> {
	body: TRequestBody;
}

export type TBody<T> = T;

export type UnknownBody = unknown;

/**
 * Supports a custom body return type, wrapped with {@link JSON.stringify} by default.
 * Works with Lambda Proxy Integration for Rest API or HTTP API integration Payload Format version 1.0
 * @see - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
 * @see {APIGatewayProxyResult} Derived from
 */
export interface EndpointResult<TResponseBody> {
	statusCode: number;
	headers?: {
		          [header: string]: boolean | number | string;
	          } | undefined;
	multiValueHeaders?: {
		                    [header: string]: Array<boolean | number | string>;
	                    } | undefined;
	body: TResponseBody;
	isBase64Encoded?: boolean | undefined;
}

export type PromiseOrEndpointResult<TResponseBody> =
	| EndpointResult<TResponseBody>
	| Promise<EndpointResult<TResponseBody>>;

export type EndpointFakeAsserter<TReqBody> = (params: any) => params is FnParams<TReqBody>;

export function getErrorPathPrepender (name: string) {
	return function (value: TypeCheckError) {
		return ({
			...value,
			path: name + value.path
		});
	};
}

export const bodyErrorPathPrepender     = getErrorPathPrepender("/body");
export const responseErrorPathPrepender = getErrorPathPrepender("/response");

export class Endpoint<TReqBody, TResBody>
	implements EndpointSchema<TReqBody, TResBody> {
	method: HttpMethods;
	path: string;
	requestBodyChecker?: CheckerFunction<TReqBody>;
	responseBodyChecker?: CheckerFunction<TResBody>;

	constructor (schema: EndpointSchema<TReqBody, TResBody>) {
		Object.assign(this, schema);
	}

	checkBody (body: any): CheckerErrorsOrNully {
		return this.requestBodyChecker?.check(body)?.map(bodyErrorPathPrepender);
	}

	checkResponse (responseBody: unknown): CheckerErrorsOrNully {
		return this.responseBodyChecker?.check(responseBody)?.map(responseErrorPathPrepender);
	}

	fakeCheckParams (params: any): params is FnParams<TReqBody> {
		return true;
	};
}

export interface APIEndpoints {
	[v: string]: Endpoint<unknown, unknown>;
}

export function endpoint<TReqBody, TResBody> (end: EndpointSchema<TReqBody, TResBody>): Endpoint<TReqBody, TResBody> {
	return new Endpoint(end);
}
