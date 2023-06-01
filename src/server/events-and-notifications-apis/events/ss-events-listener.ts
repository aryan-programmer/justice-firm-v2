import pMap from "p-map";
import {NotificationType} from "../../../common/notification-types";
import {StatusEnum} from "../../../common/utils/constants";
import {EventsListenerAPIImplementation, ListenerEvent} from "../../../singularity/events/events-endpoint";
import {RedisCacheModel} from "../../common/redis-cache-model";
import {LawyerProfileUpdateData, LawyersStatusesUpdateData, ssEventsSchema} from "../../common/ss-events-schema";
import {WsNotificationsHelper} from "../notifications/ws-notifications-helper";

export class SSEventsListener implements EventsListenerAPIImplementation<typeof ssEventsSchema> {
	constructor (private common: RedisCacheModel, private notifs: WsNotificationsHelper) {
	}

	async lawyerProfileUpdate (ev: ListenerEvent<LawyerProfileUpdateData>) {
		const params = ev.params;
		console.log({lawyerProfileUpdate: params});
		await this.common.invalidateLawyerCache(params.ids, {
			invalidateCaseSpecializations: params.invalidateCaseSpecializations === true
		});
	}

	async lawyersStatusesUpdate (ev: ListenerEvent<LawyersStatusesUpdateData>) {
		console.log("lawyersStatusesUpdate: ", ev);
		await pMap(ev.params.confirmed, id => this.notifs.sendNotification(id, ev.timestamp, {
			type:   NotificationType.LawyerStatusUpdate,
			status: StatusEnum.Confirmed
		}));
		await pMap(ev.params.rejected, ({id, reason}) => this.notifs.sendNotification(id, ev.timestamp, {
			type:            NotificationType.LawyerStatusUpdate,
			status:          StatusEnum.Rejected,
			rejectionReason: reason
		}));
		await pMap(ev.params.waiting, id => this.notifs.sendNotification(id, ev.timestamp, {
			type:   NotificationType.LawyerStatusUpdate,
			status: StatusEnum.Waiting
		}));
	}
}
