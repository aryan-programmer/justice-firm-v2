import {SNSEvent, SNSEventRecord} from "aws-lambda";
import {APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2} from "aws-lambda/trigger/api-gateway-proxy";
import pMap from 'p-map';
import {RedisCacheModel} from "~~/src/server/common/redis-cache-model";
import {
	EVENT_NAME_ATTRIBUTE,
	EVENT_TIMESTAMP_ATTRIBUTE,
	ListenerEvent
} from "~~/src/singularity/events/events-endpoint";
import {eventsListenerLambdaFunnelWrapper} from "~~/src/singularity/events/events.listener";
import {jfNotificationsApiSchema} from "../../common/ws-notifications-api-schema";
import {awsWSLambdaFunnelWrapper} from "../../singularity/websocket/ws-model.server";
import {pq} from "../common/background-promise-queue";
import {ssEventsSchema} from "../common/ss-events-schema";
import {strToDate} from "../common/utils/date-to-str";
import {SSEventsListener} from "./events/ss-events-listener";
import {JusticeFirmWsNotificationsAPIImpl} from "./notifications/ws-notifications-api-impl";
import {WsNotificationsHelper} from "./notifications/ws-notifications-helper";

const common                     = new RedisCacheModel();
const notifs                     = new WsNotificationsHelper(common);
const listenerImpl               = new SSEventsListener(common, notifs);
const wsNotificationsApiBaseImpl = new JusticeFirmWsNotificationsAPIImpl(common);
const wsNotificationsApiImpl     = awsWSLambdaFunnelWrapper(jfNotificationsApiSchema, wsNotificationsApiBaseImpl, {
	validateOutputs: false,
});
const listenerFn                 = eventsListenerLambdaFunnelWrapper(ssEventsSchema, listenerImpl, {
	validateEventData: false,
	unwrap (event: SNSEventRecord): ListenerEvent<string> {
		return {
			event:     event.Sns.MessageAttributes[EVENT_NAME_ATTRIBUTE].Value,
			params:    event.Sns.Message,
			timestamp: strToDate(event.Sns.MessageAttributes[EVENT_TIMESTAMP_ATTRIBUTE].Value)
		};
	}
});

export async function handlerBase (event: APIGatewayProxyWebsocketEventV2 | SNSEvent): Promise<APIGatewayProxyStructuredResultV2 | void> {
	// console.log(event);
	if ("Records" in event) {
		await pMap(event.Records, listenerFn);
		return;
	}
	const ev       = event as APIGatewayProxyWebsocketEventV2;
	const routeKey = ev.requestContext.routeKey;
	const resource = wsNotificationsApiImpl?.[routeKey];
	if (resource == null) {
		return {
			statusCode: 404,
			body:       `{"message": "The route key ${routeKey} is not supported for the websocket notifications API."}`,
		};
	}
	return await resource(ev);
}

export async function handler (event: APIGatewayProxyWebsocketEventV2 | SNSEvent): Promise<APIGatewayProxyStructuredResultV2 | void> {
	const res = await handlerBase(event);
	// console.log(res);
	await pq.waitForAll();
	return res;
}
