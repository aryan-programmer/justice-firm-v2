import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {Nuly, PromiseOr} from "../common/utils/types";
import {constants} from "./constants";
import {APIEndpoints, Endpoint, EndpointResult, FnParams, PromiseOrEndpointResult,} from "./endpoint";
import {APIAwsFunnelWrapper, APIImplementation, APIModelSchema} from "./schema";
import {TypeCheckError} from "./types";

export function errorsToResponse (errors: TypeCheckError[]) {
	return {
		statusCode: constants.HTTP_STATUS_BAD_REQUEST,
		body:       {errors}
	}
}

export class EarlyExitResponseError extends Error {
	constructor (public readonly response: { statusCode: number; body: unknown }) {
		super("Early Exit");
	}
}

export async function baseWrapperFunction<TReqBody,
	TResBody,
	TEndpoints extends APIEndpoints,
	TEvent,
	TResult extends { statusCode: number, body: TResBody }> (
	implFn: (params: FnParams<TReqBody>, event: TEvent) => PromiseOr<TResult>,
	validateOutputs: boolean,
	event: TEvent,
	bodyStr: string | Nuly,
	endpoint: Endpoint<TReqBody, TResBody>,
	key: string
) {
	try {
		let body   = bodyStr == null ? null : JSON.parse(bodyStr);
		let errors = endpoint.checkBody(body);
		if (errors != null && errors.length !== 0) {
			return errorsToResponse(errors);
		}
		let params: FnParams<any> = {
			body,
		};

		const origRes = await implFn(params, event);
		if (validateOutputs) {
			const errors = endpoint.checkResponse(origRes.body);
			if (errors != null && errors.length !== 0) {
				return errorsToResponse(errors);
			}
		}
		return origRes;
	} catch (e) {
		console.error(e);
		if (e instanceof EarlyExitResponseError) {
			return e.response;
		}
		return {
			statusCode: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
			body:       {error: e}
		};
	}
}

function awsWrapGetter<TEndpoints extends APIEndpoints = APIEndpoints> (
	impl: APIImplementation<APIModelSchema<TEndpoints>>,
	options?: { validateOutputs: boolean }
) {
	const {validateOutputs = true} = options ?? {};
	return function awsWrap<TReqBody, TResBody> (endpoint: Endpoint<TReqBody, TResBody>, key: string) {
		const implFn = async (params: FnParams<TReqBody>, event: APIGatewayProxyEvent): Promise<EndpointResult<TResBody>> => {
			console.log("Calling implFn: ", key, {params, event});
			const res = await impl[key](
				params,
				event) as PromiseOrEndpointResult<TResBody>;
			// console.log("implFn result: ", res);
			return res;
		};
		return async function transformerFunction (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
			const res: {
				body: unknown;
				statusCode: number,
				headers?: Record<string, unknown>
			} = await baseWrapperFunction(
				implFn,
				validateOutputs,
				event,
				event.body,
				endpoint,
				key);
			return {
				...res,
				headers: {
					"Access-Control-Allow-Headers": "*",
					"Access-Control-Allow-Origin":  "*",
					"Access-Control-Allow-Methods": "*",
					...res.headers
				},
				body:    JSON.stringify(res.body)
			}
		}
	}
}

export function awsLambdaFunnelWrapper<TEndpoints extends APIEndpoints = APIEndpoints> (
	modelSchema: APIModelSchema<TEndpoints>,
	impl: APIImplementation<APIModelSchema<TEndpoints>>,
	options?: { validateOutputs: boolean }
): APIAwsFunnelWrapper {
	const awsWrap = awsWrapGetter(impl, options);
	const res     = {} as APIAwsFunnelWrapper;
	for (const [key, endpoint] of Object.entries(modelSchema.endpoints)) {
		(res[endpoint.path] ??= {})[endpoint.method] = awsWrap(endpoint, key);
	}
	return res;
}
