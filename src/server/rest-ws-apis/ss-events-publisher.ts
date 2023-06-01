import {PublishCommand, PublishCommandOutput, SNSClient} from "@aws-sdk/client-sns";
import {ssEventsSchema} from "../common/ss-events-schema";
import {
	EVENT_NAME_ATTRIBUTE,
	EVENT_TIMESTAMP_ATTRIBUTE,
	ListenerEvent
} from "~~/src/singularity/events/events-endpoint";
import {eventsPublisher} from "~~/src/singularity/events/events.publisher";
import {eventsSnsTopicArn, region} from "../common/environment-clients";
import {dateToDynamoDbStr} from "../common/utils/date-to-str";

const snsClient = new SNSClient({region});

export const ssEventsPublisher = eventsPublisher(ssEventsSchema, {
	validateEventsBody: true,
	async publish (params: ListenerEvent<string>): Promise<void> {
		const publishCommandOutput: PublishCommandOutput = await snsClient.send(new PublishCommand({
			TopicArn:          eventsSnsTopicArn,
			Message:           params.params,
			MessageAttributes: {
				[EVENT_NAME_ATTRIBUTE]: {
					DataType:    "String",
					StringValue: params.event,
				},
				[EVENT_TIMESTAMP_ATTRIBUTE]: {
					DataType:    "String",
					StringValue: dateToDynamoDbStr(params.timestamp),
				},
			},
		}));
		console.log({params, publishCommandOutput});
	},
});
