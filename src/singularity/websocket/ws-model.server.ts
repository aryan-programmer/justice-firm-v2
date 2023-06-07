import {ApiGatewayManagementApiClient, PostToConnectionCommand} from "@aws-sdk/client-apigatewaymanagementapi";
import {APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import {region} from "../../server/common/environment-clients";
import {constants} from "../constants";
import {APIEndpoints, Endpoint, FnParams, getErrorPathPrepender} from "../endpoint";
import {baseWrapperFunction, EarlyExitResponseError, errorsToResponse} from "../model.server";
import {
	WS_RESPONSE_EVENT_PREFIX,
	WS_SEND_REQUEST_ID,
	WSAPIAwsFunnelWrapper,
	WSAPIImplementation,
	WSAPIModelSchema,
	WSEndpointResult,
	WSEvents,
	WSEventsSender
} from "./ws-endpoint";

function awsWrapGetter<TEndpoints extends APIEndpoints = APIEndpoints, TEvents extends WSEvents = WSEvents> (
	impl: WSAPIImplementation<WSAPIModelSchema<TEndpoints, TEvents>>,
	options?: { validateOutputs: boolean }
) {
	const {validateOutputs = true} = options ?? {};
	return function awsWrap<TReqBody, TResBody> (endpoint: Endpoint<TReqBody, TResBody>, key: string) {
		async function implFn (params: FnParams<TReqBody>, event: APIGatewayProxyWebsocketEventV2): Promise<WSEndpointResult<TResBody>> {
			const res = await impl[key](params, event) as WSEndpointResult<TResBody>;
			return {
				...res,
				___RES_KEEP_BODY___: {
					...res,
					[WS_SEND_REQUEST_ID]: (params.body as any)?.[WS_SEND_REQUEST_ID],
					event:                WS_RESPONSE_EVENT_PREFIX + key,
				}
			} as WSEndpointResult<TResBody>;
		}

		return async function transformerFunction (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyStructuredResultV2> {
			const response = await baseWrapperFunction(implFn, validateOutputs, event, event.body, endpoint, key);
			return {
				...response,
				statusCode: response.statusCode === constants.HTTP_STATUS_NO_CONTENT ? constants.HTTP_STATUS_OK : response.statusCode,
				body:       JSON.stringify((response as any).___RES_KEEP_BODY___, null, 0),
				// @ts-ignore
				___RES_KEEP_BODY___: undefined as never,
			};
		};
	};
}

export function awsWSLambdaFunnelWrapper<TEndpoints extends APIEndpoints = APIEndpoints, TEvents extends WSEvents = WSEvents> (
	modelSchema: WSAPIModelSchema<TEndpoints, TEvents>,
	impl: WSAPIImplementation<WSAPIModelSchema<TEndpoints, TEvents>>,
	options?: { validateOutputs: boolean }
): WSAPIAwsFunnelWrapper {
	const awsWrap = awsWrapGetter(impl, options);
	const res     = {} as WSAPIAwsFunnelWrapper;
	for (const [key, endpoint] of Object.entries(modelSchema.endpoints)) {
		res[endpoint.path] = awsWrap(endpoint, key);
	}
	return res;
}

export function eventsSender<TEndpoints extends APIEndpoints = APIEndpoints,
	TEvents extends WSEvents = WSEvents> (
	modelSchema: WSAPIModelSchema<TEndpoints, TEvents>,
	options: { validateEventsBody: boolean, endpoint: string }
): WSEventsSender<TEvents> {
	const manager            = new ApiGatewayManagementApiClient({
		region,
		endpoint: options.endpoint,
	});
	const encoder            = new TextEncoder();
	const validateEventsBody = options.validateEventsBody ?? false;

	const res: Record<string, <T>(v: T, connId: string) => void> = {};
	for (const [eventName, eventChecker] of Object.entries(modelSchema.events)) {
		const eventBodyErrorPathPrepender = getErrorPathPrepender("/on-" + eventName);
		res[eventName]                    = async <T> (body: T, connId: string) => {
			if (validateEventsBody) {
				let errors = eventChecker.check(body)?.map(eventBodyErrorPathPrepender);
				if (errors != null && errors.length !== 0) {
					throw new EarlyExitResponseError(errorsToResponse(errors));
				}
			}

			let eventBody  = {
				event: eventName,
				body
			};
			const postData = JSON.stringify(eventBody, null, 0);
			await manager.send(new PostToConnectionCommand({
				Data:         encoder.encode(postData),
				ConnectionId: connId
			}));
		};
	}
	return res as WSEventsSender<TEvents>;
}
