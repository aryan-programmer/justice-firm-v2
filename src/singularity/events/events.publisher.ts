import {
	EventDefinitions,
	EventsModelSchema,
	EventsPublisher,
	ListenerEvent
} from "~~/src/singularity/events/events-endpoint";
import {prettyPrint} from "../../common/utils/pretty-print";
import {getErrorPathPrepender} from "../endpoint";
import {EarlyExitResponseError, errorsToResponse} from "../model.server";

/*{
			event: KEventName
		} & (TDefs[KEventName] extends CheckerFunction<infer EventType> ? EventType : never)*/

export function eventsPublisher<TDefs extends EventDefinitions = EventDefinitions> (
	modelSchema: EventsModelSchema<TDefs>,
	options: {
		validateEventsBody: boolean,
		publish<KEventName extends keyof TDefs> (params: ListenerEvent<string>): Promise<void>
	},
): EventsPublisher<TDefs> {
	const publish            = options.publish.bind(options);
	const validateEventsBody = options.validateEventsBody ?? false;

	const res: Record<string, <T>(v: T) => void> = {};
	for (const [eventName, eventChecker] of Object.entries(modelSchema.events)) {
		const eventBodyErrorPathPrepender = getErrorPathPrepender("/onDispatch-" + eventName);
		res[eventName]                    = async <T> (body: T) => {
			if (validateEventsBody) {
				let errors = eventChecker.check(body)?.map(eventBodyErrorPathPrepender);
				if (errors != null && errors.length !== 0) {
					throw new EarlyExitResponseError(errorsToResponse(errors));
				}
			}

			let eventBody = {
				event: eventName,
				...body
			};
			prettyPrint(eventBody);
			const postData = JSON.stringify(eventBody, null, 0);
			await publish({
				event:     eventName,
				params:    postData,
				timestamp: new Date()
			});
		};
	}
	return res as EventsPublisher<TDefs>;
}
