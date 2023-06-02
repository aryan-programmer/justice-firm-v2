import {CheckerFunction} from "../types";

export interface ListenerEvent<TEventParams> {
	event: string,
	params: TEventParams,
	timestamp: Date
}

export type EventsListenerAPIImplementation<TSchema, InEvent = any> = TSchema extends EventsModelSchema<infer TDefs> ? {
	[K in keyof TDefs]: TDefs[K] extends CheckerFunction<infer TEventParams> ?
	                    (params: ListenerEvent<TEventParams>, event: InEvent) => Promise<void> | void
	                                                                         : never;
} : null;

export interface EventDefinitions {
	[v: string]: CheckerFunction<unknown>;
}

export interface EventsModelSchema<TDefs extends EventDefinitions = EventDefinitions> {
	name: string,
	events: TDefs
}

export type EventsAPIFunnelWrapper<InEvent> = (event: InEvent) => Promise<void>;

export type EventsPublisher<TEvents> = {
	[T in keyof TEvents]: TEvents[T] extends CheckerFunction<infer TEventBody> ? (v: TEventBody) => void : never;
};

export function eventsModelSchema<TEv extends EventDefinitions> (val: {
	name: string,
	events: TEv
}): EventsModelSchema<TEv> {
	return val;
}

export const EVENT_NAME_ATTRIBUTE      = "__EVENT_NAME_ATTRIBUTE__";
export const EVENT_TIMESTAMP_ATTRIBUTE = "__EVENT_TIMESTAMP_ATTRIBUTE__";
