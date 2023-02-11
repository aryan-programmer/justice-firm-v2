import {APIGatewayProxyEvent, APIGatewayProxyResult}                                    from "aws-lambda";
import {APIEndpoints, EndpointFnParamsFromRaw, EndpointSchema, PromiseOrEndpointResult} from "./endpoint";
import {HttpMethods}                                                                    from "./httpMethods";
import {CheckerErrorsOrNully}                                                           from "./types";


export type APIImplementation<TSchema> = TSchema extends APIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TQueryParameters,
		                     infer TReqBody,
		                     infer TPath,
		                     infer TResBody> ?
	                (params: EndpointFnParamsFromRaw<TReqBody, TQueryParameters, TPath>, event: APIGatewayProxyEvent) => PromiseOrEndpointResult<TResBody>
	                                         : never;
} : never;

//*
export type APIModelValidators<TSchema> =
	TSchema extends APIModelSchema<infer T>
		/*/
		export type APIModelValidators<T> =
			true extends true
				//*/
	? {
		[K in keyof T]: T[K] extends EndpointSchema<infer TQueryParameters,
			                     infer TReqBody,
			                     infer TPath,
			                     infer TResBody> ?
		                (params: any, out: { errors: CheckerErrorsOrNully }) => params is EndpointFnParamsFromRaw<TReqBody, TQueryParameters, TPath>
		                                         : never;
	} : never;

export type APIAwsLambdaWrapper<TSchema> = TSchema extends APIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TQueryParameters,
		                     infer TReqBody,
		                     infer TPath,
		                     infer TResBody> ?
	                (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
	                                         : never;
} : never;

export type APIAwsFunnelWrapper = Record<string, Partial<Record<HttpMethods, (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>>>>;

export interface APIModelSchema<T extends APIEndpoints = APIEndpoints> {
	name: string,
	endpoints: T,
}

export function modelSchema<T extends APIEndpoints> (val: { name: string, endpoints: T }): APIModelSchema<T> {
	return val;
}
