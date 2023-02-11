import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {HttpMethods}                                 from "../singularity/httpMethods";

import {mathApiAwsFunnelFunctions} from "./api-impl";

const distribution = mathApiAwsFunnelFunctions();

// module.exports        = mathApiAwsLambdaFunctions();
export async function handler (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
	const resource = distribution?.[event.resource];
	const fn       = resource?.[event.httpMethod as HttpMethods];
	if (resource == null) {
		return {
			statusCode: 404,
			body:       `{"message": "The resource ${event.resource} is not supported."}`
		};
	}
	if (fn == null) {
		return {
			statusCode: 404,
			body:       `{"message": "The method ${event.httpMethod} is not supported on the resource ${event.resource}"}`
		};
	}
	return fn(event);
}
