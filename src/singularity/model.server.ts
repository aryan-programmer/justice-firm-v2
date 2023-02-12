import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {isLeft, isRight} from "fp-ts/lib/Either";
import mapValues from "lodash/mapValues";
import {assert} from "../common/utils/asserts";
import {constants} from "./constants";
import {
	APIEndpoints,
	Endpoint,
	EndpointPathDefinition,
	FnParams,
	PathParametersSchema,
	QueryParametersSchema
} from "./endpoint";
import {pathSchemaToString} from "./helpers";
import {APIAwsFunnelWrapper, APIAwsLambdaWrapper, APIImplementation, APIModelSchema} from "./schema";
import {TypeCheckError} from "./types";

function errorsToResponse (errors: TypeCheckError[]): APIGatewayProxyResult {
	return {
		statusCode: constants.HTTP_STATUS_BAD_REQUEST,
		body:       JSON.stringify({errors}, null, 0)
	}
}

// export class APIServerModel<TEndpoints extends APIEndpoints = APIEndpoints> {
// 	constructor (private modelSchema: APIModelSchema<TEndpoints>) {
// 	}
//
// }

export function transformer (v: APIGatewayProxyResult): APIGatewayProxyResult {
	return {
		...v,
		headers: {
			"Access-Control-Allow-Headers": "*",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "*",
			...v.headers
		},
	}
}

function awsWrapGetter<TEndpoints extends APIEndpoints = APIEndpoints> (
	impl: APIImplementation<APIModelSchema<TEndpoints>>,
	options?: { validateOutputs: boolean }
) {
	const {validateOutputs = true} = options ?? {};
	return function awsWrap<TQueryParameters extends QueryParametersSchema,
		TReqBody,
		TPath extends EndpointPathDefinition<PathParametersSchema | null | undefined>,
		TResBody> (
		endpoint: Endpoint<TQueryParameters, TReqBody, TPath, TResBody>,
		key: string
	) {
		return async function transformerFunction (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
			return transformer(await baseFunction(event));
		}

		async function baseFunction (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
			try {
				let body               = event.body == null ? null : JSON.parse(event.body);
				let queryParamsOrError = endpoint.parseQueryParams(event.queryStringParameters);
				let pathParamsOrError  = endpoint.parsePathParams(event.pathParameters);
				let errors             = endpoint.checkBody(body);
				if (isLeft(pathParamsOrError)) {
					(errors ??= []).push(...pathParamsOrError.left);
				}
				if (isLeft(queryParamsOrError)) {
					(errors ??= []).push(...queryParamsOrError.left);
				}
				if (errors != null && errors.length !== 0) {
					return errorsToResponse(errors);
				}
				assert(isRight(pathParamsOrError));
				assert(isRight(queryParamsOrError));
				let params: FnParams<any, any, any> = {
					body,
					queryParams: queryParamsOrError.right,
					pathParams:  pathParamsOrError.right
				};

				const origRes = await impl[key](params, event);
				if (validateOutputs) {
					const errors = endpoint.checkResponse(origRes.body);
					if (errors != null && errors.length !== 0) {
						return errorsToResponse(errors);
					}
				}
				return {
					...origRes,
					body: JSON.stringify(origRes.body)
				};
			} catch (e) {
				console.error(e);
				return {
					statusCode: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					body:       JSON.stringify({error: e})
				};
			}
		}
	}
}

export function awsLambdaWrapper<TEndpoints extends APIEndpoints = APIEndpoints> (
	modelSchema: APIModelSchema<TEndpoints>,
	impl: APIImplementation<APIModelSchema<TEndpoints>>,
	options?: { validateOutputs: boolean }
): APIAwsLambdaWrapper<APIModelSchema<TEndpoints>> {
	return mapValues(modelSchema.endpoints,
		awsWrapGetter(impl, options)) as APIAwsLambdaWrapper<APIModelSchema<TEndpoints>>;
}

export function awsLambdaFunnelWrapper<TEndpoints extends APIEndpoints = APIEndpoints> (
	modelSchema: APIModelSchema<TEndpoints>,
	impl: APIImplementation<APIModelSchema<TEndpoints>>,
	options?: { validateOutputs: boolean }
): APIAwsFunnelWrapper {
	const awsWrap = awsWrapGetter(impl, options);
	const res     = {} as APIAwsFunnelWrapper;
	for (const [key, endpoint] of Object.entries(modelSchema.endpoints)) {
		(res[pathSchemaToString(endpoint.path)] ??= {})[endpoint.method] = awsWrap(endpoint, key);
	}
	return res;
}

