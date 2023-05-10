import {Either, isLeft, left, right} from "fp-ts/lib/Either";
import mapValues from "lodash/mapValues";
import {sleep} from "../common/utils/sleep";
import {constants} from "./constants";
import {APIEndpoints, Endpoint, EndpointSchema,} from "./endpoint";
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

export type ModelResponseOrErr<T> = Either<CheckerErrors | Error, ModelResponse<T>>;

export type APIFetchImplementation<TSchema> = TSchema extends APIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TReqBody, infer TResBody> ?
	                (body: TReqBody) => Promise<ModelResponseOrErr<TResBody>> : never;
} : never;

export interface FetchImplMapperOptions {
	validateInputs?: boolean;
	validateOutputs?: boolean;
	baseUrl: string,
}

function shouldRetry<TResBody> (v: ModelResponseOrErr<TResBody>) {
	if (isLeft(v)) {
		return v.left instanceof Error;
	}
	const right = v.right;
	return !right.ok
	       && right.status !== constants.HTTP_STATUS_UNAUTHORIZED
	       && right.status !== constants.HTTP_STATUS_FORBIDDEN
	       && right.status !== constants.HTTP_STATUS_NOT_FOUND;
}

function fetchImplementationMapper<TEndpoints extends APIEndpoints = APIEndpoints> (
	options: FetchImplMapperOptions
) {
	const {validateInputs = true, validateOutputs = false, baseUrl} = options ?? {};
	return function fetchWrap<TReqBody, TResBody> (
		endpoint: Endpoint<TReqBody, TResBody>,
		key: string
	) {
		const endpointPath = baseUrl + endpoint.path;
		return async function reFetcherFunction (body: TReqBody): Promise<ModelResponseOrErr<TResBody>> {
			const res1 = await errorLefter(body);
			if (shouldRetry(res1)) {
				console.log("Retrying on ", res1, " on event ", body);
				await sleep(1000);
				return await baseFunction(body);
			}
			return res1;
		};

		async function errorLefter (body: TReqBody): Promise<ModelResponseOrErr<TResBody>> {
			try {
				return await baseFunction(body);
			} catch (e) {
				console.log(e);
				if (e instanceof Error) {
					return left(e);
				}
				return left([{
					path:    "/",
					message: "Error",
					value:   e,
				}]);
			}
		}

		async function baseFunction (body: TReqBody): Promise<ModelResponseOrErr<TResBody>> {
			if (validateInputs) {
				const errors = endpoint.checkBody(body);
				if (errors != null && errors.length !== 0) {
					console.log(body);
					return left(errors);
				}
			}

			const response = await fetch(endpointPath, {
				body:   JSON.stringify(body),
				method: endpoint.method,
			});
			const origBody = response.status === constants.HTTP_STATUS_NO_CONTENT ? undefined : await response.json();
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
