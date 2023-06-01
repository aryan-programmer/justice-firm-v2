import {Static, Type} from "@sinclair/typebox";
import {ID_T} from "../../common/db-types";
import {ArrayOf} from "../../common/utils/functions";
import {OptionalBoolean_T, String_T} from "../../common/utils/types";
import {eventsModelSchema} from "../../singularity/events/events-endpoint";
import {lazyCheck} from "../../singularity/helpers";

export const LawyerProfileUpdateData = Type.Object({
	ids:                           ArrayOf(ID_T),
	invalidateCaseSpecializations: OptionalBoolean_T,
}, {$id: "LawyerProfileUpdateData"});
export type LawyerProfileUpdateData = Static<typeof LawyerProfileUpdateData>;

export const LawyersStatusesUpdateData = Type.Object({
	confirmed: ArrayOf(ID_T),
	rejected:  ArrayOf(Type.Object({
		id:     ID_T,
		reason: String_T
	})),
	waiting:   ArrayOf(ID_T),
}, {$id: "LawyersStatusesUpdateData"});
export type LawyersStatusesUpdateData = Static<typeof LawyersStatusesUpdateData>;

export const ssEventsSchema = eventsModelSchema({
	name:   "JusticeFirm-ServerSide-EventsSchema",
	events: {
		lawyerProfileUpdate:   lazyCheck(LawyerProfileUpdateData),
		lawyersStatusesUpdate: lazyCheck(LawyersStatusesUpdateData)
	},
});
