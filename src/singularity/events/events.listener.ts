import {
	EventDefinitions,
	EventsAPIFunnelWrapper,
	EventsListenerAPIImplementation,
	EventsModelSchema,
	ListenerEvent
} from "~~/src/singularity/events/events-endpoint";
import {errorsToResponse} from "../model.server";

export function eventsListenerLambdaFunnelWrapper<InEvent, TDefs extends EventDefinitions = EventDefinitions> (
	modelSchema: EventsModelSchema<TDefs>,
	impl: EventsListenerAPIImplementation<EventsModelSchema<TDefs>, InEvent>,
	options: {
		validateEventData: boolean,
		unwrap (event: InEvent): ListenerEvent<string>,
	}
): EventsAPIFunnelWrapper<InEvent> {
	const validateEventData = options.validateEventData === true;
	const unwrap            = options.unwrap.bind(options);
	const events            = modelSchema.events;
	return async (event: InEvent): Promise<void> => {
		const {event: eventName, params, timestamp} = unwrap(event);
		let body                                    = params == null ? null : JSON.parse(params);
		let errors                                  = events[eventName].check(body);
		if (validateEventData && errors != null && errors.length !== 0) {
			console.trace(errorsToResponse(errors));
			// TODO: Error logged & ignored
			return;
		}
		await impl[eventName]({
			event:  eventName,
			params: body,
			timestamp,
		} as ListenerEvent<unknown>, event);
	};
}
