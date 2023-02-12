import {Either, left, right} from "fp-ts/lib/Either";
import mapValues from "lodash/mapValues";
import {assert} from "../common/utils/asserts";
import {
	APIEndpoints,
	Endpoint,
	EndpointFnParamsFromRaw,
	EndpointPathDefinition,
	EndpointSchema,
	PathParametersSchema,
	QueryParametersSchema
} from "./endpoint";
import {APIModelSchema} from "./schema";
import {CheckerErrors} from "./types";

export type ModelResponse<T> = {
	headers: Headers;
	ok: boolean;
	redirected: boolean;
	status: number;
	statusText: string;
	type: ResponseType;
	url: string;
	body?: T;
};

export type ModelResponseOrErr<T> = Either<CheckerErrors, ModelResponse<T>>;

export type APIFetchImplementation<TSchema> = TSchema extends APIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TQueryParameters,
		                     infer TReqBody,
		                     infer TPath,
		                     infer TResBody> ?
	                (params: Partial<EndpointFnParamsFromRaw<TReqBody, TQueryParameters, TPath>>) => Promise<ModelResponseOrErr<TResBody>>
	                                         : never;
} : never;

// export class APIServerModel<TEndpoints extends APIEndpoints = APIEndpoints> {
// 	constructor (private modelSchema: APIModelSchema<TEndpoints>) {
// 	}
//
// }

export interface FetchImplMapperOptions {
	validateInputs?: boolean;
	validateOutputs?: boolean;
	baseUrl: string,
}

function fetchImplementationMapper<TEndpoints extends APIEndpoints = APIEndpoints> (
	options: FetchImplMapperOptions
) {
	const {validateInputs = true, validateOutputs = false, baseUrl} = options ?? {};
	return function fetchWrap<TQueryParameters extends QueryParametersSchema,
		TReqBody,
		TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>,
		TResBody> (
		endpoint: Endpoint<TQueryParameters, TReqBody, TPath, TResBody>,
		key: string
	) {
		assert(typeof endpoint.path === "string");
		const endpointPath = baseUrl + endpoint.path;
		return async function (event: Partial<EndpointFnParamsFromRaw<TReqBody, TQueryParameters, TPath>>): Promise<ModelResponseOrErr<TResBody>> {
			let {body, queryParams, pathParams} = event;
			if (validateInputs) {
				const errors = endpoint.checkBody(body);
				if (errors != null && errors.length !== 0) {
					return left(errors);
				}
			}
			// TODO: queryParams, pathParams
			// if (isLeft(pathParamsOrError)) {
			// 	(errors ??= []).push(...pathParamsOrError.left);
			// }
			// if (isLeft(queryParamsOrError)) {
			// 	(errors ??= []).push(...queryParamsOrError.left);
			// }
			// assert(isRight(pathParamsOrError));
			// assert(isRight(queryParamsOrError));

			const response = await fetch(endpointPath, {
				body:   JSON.stringify(body),
				method: endpoint.method,
			});
			const origBody = await response.json();
			if (validateOutputs) {
				const errors = endpoint.checkResponse(origBody);
				if (errors != null && errors.length !== 0) {
					return left(errors);
				}
			}
			const res: ModelResponse<TResBody> = {
				headers:    response.headers,
				ok:         response.ok,
				redirected: response.redirected,
				status:     response.status,
				statusText: response.statusText,
				type:       response.type,
				url:        response.url,
				body:       origBody,
			};
			return right(res);
		}
	}
}

export function fetchImplementation<TEndpoints extends APIEndpoints = APIEndpoints> (
	modelSchema: APIModelSchema<TEndpoints>,
	options: FetchImplMapperOptions
): APIFetchImplementation<APIModelSchema<TEndpoints>> {
	return mapValues(modelSchema.endpoints,
		fetchImplementationMapper(options)) as APIFetchImplementation<APIModelSchema<TEndpoints>>;
}
