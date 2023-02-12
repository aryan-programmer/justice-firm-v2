import {
	APIGatewayProxyEventPathParameters,
	APIGatewayProxyEventQueryStringParameters,
	APIGatewayProxyResult
} from "aws-lambda/trigger/api-gateway-proxy";
//import * as E from "fp-ts/lib/Either";
import {Either, isLeft, isRight, left, right} from "fp-ts/lib/Either";
import {HttpMethods} from "./httpMethods";
import {CheckerErrors, CheckerErrorsOrNully, CheckerFunction, Parser, TypeCheckError} from "./types";

export type PathParamSchema<TValue> = { name: string, parser: Parser<TValue> };
export type PathParametersSchema = PathParamSchema<unknown>[];

export interface EndpointPathDefinitionWithPathParams<TPathParams extends PathParametersSchema = PathParametersSchema> {
	pathSegments: string[];
	pathParams: TPathParams;
}

export type QueryParametersSchema = {
	[v: string]: Parser<unknown>
};

export type EndpointPathDefinition<TPathParams extends PathParametersSchema | null | undefined> =
	| string
	| (TPathParams extends PathParametersSchema ? EndpointPathDefinitionWithPathParams<TPathParams> : string);

export interface EndpointSchema<TQueryParams extends QueryParametersSchema,
	TReqBody,
	TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>,
	TResBody> {
	method: HttpMethods;
	path: TPath;
	queryParams?: TQueryParams;
	requestBodyChecker?: CheckerFunction<TReqBody>;
	responseBodyChecker?: CheckerFunction<TResBody>;
}

type FilterNullish<T extends unknown[]> = T extends [] ? [] :
                                          T extends [infer H, ...infer R] ?
                                          H extends undefined | null | never | void ? FilterNullish<R> : [H, ...FilterNullish<R>] : T

type PathParamsFromPathDefinition<T> = T extends EndpointPathDefinitionWithPathParams<infer TPathParams> ? {
	[TKey in keyof TPathParams]: TPathParams[TKey] extends PathParamSchema<infer TValue> ? TValue : never
} : never;

type QueryParamsObjectFromParams<T extends QueryParametersSchema> = {
	[TKey in keyof T]: T[TKey] extends Parser<infer TValue> ? TValue : never
};

export interface FnParams<TRequestBody, TQueryParamsObject = unknown, TPathParams extends unknown[] | never = never> {
	body: TRequestBody,
	queryParams: TQueryParamsObject
	pathParams: TPathParams;// extends  ? PathParamFromSchema<TPathParams> : never;
}

export type TBody<T> = T;
export type TQuery<T> = T;
export type TPath<T> = T;

export type UnknownBody = unknown;
export type UnknownQuery = unknown;
export type UnknownPath = unknown;

export type EndpointFnParamsFromRaw<TReqBody, TQueryParameters extends QueryParametersSchema, TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>> =
	FnParams<TReqBody, QueryParamsObjectFromParams<TQueryParameters>, PathParamsFromPathDefinition<TPath>>

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

export type EndpointFakeAsserter<TQueryParameters extends QueryParametersSchema, TReqBody, TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>> =
	(params: any) => params is EndpointFnParamsFromRaw<TReqBody, TQueryParameters, TPath>;

function getErrorPathPrepender (name: string) {
	return function (value: TypeCheckError) {
		return ({
			...value,
			path: name + value.path
		});
	};
}

export class Endpoint<TQueryParams extends QueryParametersSchema, TReqBody, TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>, TResBody>
	implements EndpointSchema<TQueryParams, TReqBody, TPath, TResBody> {
	method: HttpMethods;
	path: TPath;
	queryParams?: TQueryParams;
	requestBodyChecker?: CheckerFunction<TReqBody>;
	responseBodyChecker?: CheckerFunction<TResBody>;

	constructor (schema: EndpointSchema<TQueryParams, TReqBody, TPath, TResBody>) {
		Object.assign(this, schema);
	}

	parsePathParams (vs: APIGatewayProxyEventPathParameters | null | undefined):
		Either<CheckerErrors, PathParamsFromPathDefinition<TPath>> {
		// noinspection SuspiciousTypeOfGuard
		if (typeof this.path === "string")
			return right(undefined as unknown as PathParamsFromPathDefinition<TPath>);
		if (this.path.pathParams.length === 0)
			return right([] as unknown as PathParamsFromPathDefinition<TPath>);

		const errors: CheckerErrors = [];
		const res                   = [];
		let adding                  = true;
		vs ??= {};
		for (const {name, parser: checker} of this.path.pathParams) {
			const parsed = checker.parse(vs[name]);
			if (adding && isRight(parsed)) {
				res.push(parsed.right);
			}
			if (isLeft(parsed)) {
				errors.push(...parsed.left.map(getErrorPathPrepender("/pathParams/" + name)));
				adding = false;
			}
		}
		if (errors.length !== 0) {
			return left(errors);
		}
		return right(res as PathParamsFromPathDefinition<TPath>);
	}

	parseQueryParams (vs: APIGatewayProxyEventQueryStringParameters | null | undefined):
		Either<CheckerErrors, QueryParamsObjectFromParams<TQueryParams>> {
		if (this.queryParams == null) {
			return right({} as QueryParamsObjectFromParams<TQueryParams>);
		}
		const errors: CheckerErrors    = [];
		const res: Record<string, any> = {};
		let adding                     = true;
		vs ??= {};
		for (const [name, checker] of Object.entries(this.queryParams)) {
			const parsed = checker.parse(vs[name]);
			if (adding && isRight(parsed)) {
				res[name] = parsed.right;
			}
			if (isLeft(parsed)) {
				errors.push(...parsed.left.map(getErrorPathPrepender("/queryParams/" + name)));
				adding = false;
			}
		}
		if (errors.length !== 0) {
			return left(errors);
		}
		return right(res as QueryParamsObjectFromParams<TQueryParams>);
	}

	checkBody (body: any): CheckerErrorsOrNully {
		return this.requestBodyChecker?.check(body)?.map(getErrorPathPrepender("/body"));
	}

	checkResponse (responseBody: unknown): CheckerErrorsOrNully {
		return this.responseBodyChecker?.check(responseBody)?.map(getErrorPathPrepender("/response"));
	}

	fakeCheckParams (params: any): params is EndpointFnParamsFromRaw<TReqBody, TQueryParams, TPath> {
		return true;
	};
}

export interface APIEndpoints {
	[v: string]: Endpoint<QueryParametersSchema, unknown, EndpointPathDefinition<PathParametersSchema | null | undefined>, unknown>
}

export function endpoint<TQueryParameters extends QueryParametersSchema,
	TReqBody,
	TPathParams extends EndpointPathDefinition<PathParametersSchema | null | undefined>,
	TResBody> (
	end: EndpointSchema<TQueryParameters,
		TReqBody,
		TPathParams,
		TResBody>): Endpoint<TQueryParameters,
	TReqBody,
	TPathParams,
	TResBody> {
	return new Endpoint(end);
}
