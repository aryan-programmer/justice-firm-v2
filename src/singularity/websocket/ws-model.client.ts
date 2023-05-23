import {EventEmitter} from "eventemitter3";
import {Either, isLeft, left, right} from "fp-ts/lib/Either";
import isBlob from "is-blob";
import WebSocketAsPromised from "websocket-as-promised";
import {sleep} from "../../common/utils/sleep";
import {constants} from "../constants";
import {APIEndpoints, Endpoint, EndpointSchema,} from "../endpoint";
import {APIModelSchema} from "../schema";
import {CheckerErrors, CheckerFunction} from "../types";
import {
	WS_RESPONSE_EVENT_PREFIX,
	WS_SEND_REQUEST_ID,
	WSAPIModelSchema,
	WSEndpointResult,
	WSEvents
} from "./ws-endpoint";

export type ModelResponse<T> = WSEndpointResult<T> & {
	ok: boolean;
};

export type WSEndpointResultOrErr<T> = Either<CheckerErrors | Error, WSEndpointResult<T>>;
export type WSModelResponseOrErr<T> = Either<CheckerErrors | Error, ModelResponse<T>>;

export type APISendImplementation<TSchema> = TSchema extends APIModelSchema<infer T> ? {
	[K in keyof T]: T[K] extends EndpointSchema<infer TReqBody, infer TResBody> ?
	                (body: TReqBody) => Promise<void> : never;
} : never;

export interface WebsocketClientOptions {
	validateInputs?: boolean;
	validateOutputs?: boolean;
	validateEventsData?: boolean;
	baseUrl: string,
}

function shouldRetry<TResBody> (v: WSModelResponseOrErr<TResBody>) {
	if (isLeft(v)) {
		return v.left instanceof Error;
	}
	const right = v.right;
	return !(200 <= right.statusCode && right.statusCode <= 299)
	       && right.statusCode !== constants.HTTP_STATUS_UNAUTHORIZED
	       && right.statusCode !== constants.HTTP_STATUS_FORBIDDEN
	       && right.statusCode !== constants.HTTP_STATUS_NOT_FOUND;
}

function sendImplementationMapper<TEndpoints extends APIEndpoints = APIEndpoints,
	TEvents extends WSEvents = WSEvents> (
	options: WebsocketClientOptions
) {
	const {validateInputs = true, validateOutputs = false} = options ?? {};
	return function fetchWrap<TReqBody, TResBody> (
		endpoint: Endpoint<TReqBody, TResBody>,
		key: string
	) {
		return async function reFetcherFunction (this: WebSocketModelClient<TEndpoints, TEvents>, body: TReqBody) {
			const res1 = await errorLefter(this.wsConnection, body);
			if (shouldRetry(res1)) {
				console.log({message: "Retrying on WEBSOCKET result and body", result: res1, body});
				await sleep(1000);
				return await baseFunction(this.wsConnection, body);
			}
			return res1;
		};

		async function errorLefter (wsConnection: WebSocketAsPromised, body: TReqBody): Promise<WSModelResponseOrErr<TResBody>> {
			try {
				return await baseFunction(wsConnection, body);
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

		async function baseFunction (wsConnection: WebSocketAsPromised, body: TReqBody): Promise<WSModelResponseOrErr<TResBody>> {
			if (validateInputs) {
				const errors = endpoint.checkBody(body);
				if (errors != null && errors.length !== 0) {
					return left(errors);
				}
			}

			const response: WSEndpointResult<TResBody> = await wsConnection.sendRequest({action: key, ...body});
			const origBody                             = response.statusCode === constants.HTTP_STATUS_NO_CONTENT ? undefined : response.body;
			if (validateOutputs) {
				const errors = endpoint.checkResponse(origBody);
				if (errors != null && errors.length !== 0) {
					return left(errors);
				}
			}
			const res: ModelResponse<TResBody> = {
				...response,
				ok: (200 <= response.statusCode && response.statusCode <= 299)
			};
			return right(res);
		}
	}
}

type ResponseEventName<TResponseName extends string> = `response:${TResponseName}`;

export type WSEventTypes<TEndpoints extends APIEndpoints = APIEndpoints, TEvents extends WSEvents = WSEvents> =
	{
		[T in keyof TEvents]: TEvents[T] extends CheckerFunction<infer TEventBody> ?
		                      (body: TEventBody) => void :
		                      never;
	} & {
		[T in keyof TEndpoints as ResponseEventName<T extends string ? T : never>]:
		/**/ TEndpoints[T] extends EndpointSchema<infer TReqBody, infer TResBody> ?
		     (body: WSEndpointResult<TResBody>) => void :
		     never
	};

export type WebSocketModelClient<TEndpoints extends APIEndpoints = APIEndpoints,
	TEvents extends WSEvents = WSEvents> =
	EventEmitter<WSEventTypes<TEndpoints, TEvents>> &
	{
		wsConnection: WebSocketAsPromised;
		open (): Promise<Event>;
		close (): Promise<CloseEvent>;
	} &
	{
		[K in keyof TEndpoints]: K extends "$connect" ? never :
		                         K extends "$disconnect" ? never :
		                         TEndpoints[K] extends EndpointSchema<infer TReqBody, infer TResBody> ?
		                         (body: TReqBody) => Promise<WSModelResponseOrErr<TResBody>> : never;
	};


export function websocketClient<TEndpoints extends APIEndpoints = APIEndpoints,
	TEvents extends WSEvents = WSEvents> (
	modelSchema: WSAPIModelSchema<TEndpoints, TEvents>,
	options: WebsocketClientOptions
) {
	const {baseUrl, validateEventsData = true} = options;

	class WebSocketModelClientImpl extends EventEmitter<WSEventTypes<TEndpoints, TEvents>> {
		wsConnection: WebSocketAsPromised;

		constructor () {
			super();
			this.wsConnection = new WebSocketAsPromised(baseUrl, {
				attachRequestId:  (data, requestId) => Object.assign({[WS_SEND_REQUEST_ID]: requestId}, data),
				extractRequestId: data => data?.[WS_SEND_REQUEST_ID],
				packMessage:      data => JSON.stringify(data),
				unpackMessage:    data => {
					if (typeof data === "string") {
						return JSON.parse(data);
					} else if (isBlob(data)) {
						return data.text().then(v => JSON.parse(v))
					}
					return Buffer.from(data).toJSON();
				}
			});
		}

		async open () {
			const value = await this.wsConnection.open();
			this.wsConnection.onMessage.addListener(ev => {
				const data: Record<string, any> = typeof ev === "string" ? JSON.parse(ev) : ev;
				if (data == null || !("event" in data) || typeof data.event !== "string") return;
				const eventName = data.event;
				if (validateEventsData) {
					let checker: CheckerFunction<unknown> | undefined;
					if (eventName.startsWith(WS_RESPONSE_EVENT_PREFIX)) {
						checker = modelSchema.endpoints[eventName.substring(WS_RESPONSE_EVENT_PREFIX.length)]?.responseBodyChecker;
					} else {
						checker = modelSchema.events[eventName];
					}
					if (!checker?.check(data)) {
						console.error("Data ",
							data,
							"for the event",
							eventName,
							"does not match the schema",
							checker?.typeName);
						return;
					}
				}

				// @ts-ignore
				this.emit(data.event, data);
			});
			return value;
		}

		async close () {
			return await this.wsConnection.close();
		}
	}

	const mapper = sendImplementationMapper(options);

	for (const [key, endpoint] of Object.entries(modelSchema.endpoints)) {
		if (key === "$connect" || key === "$disconnect") continue;
		(WebSocketModelClientImpl.prototype as any)[key] = mapper(endpoint, key);
	}

	return WebSocketModelClientImpl as unknown as {
		new (): WebSocketModelClient<TEndpoints, TEvents>
	};
}
