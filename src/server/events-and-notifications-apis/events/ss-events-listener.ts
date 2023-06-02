import {NotificationType} from "../../../common/notification-types";
import {StatusEnum} from "../../../common/utils/constants";
import {EventsListenerAPIImplementation, ListenerEvent} from "../../../singularity/events/events-endpoint";
import {RedisCacheModel} from "../../common/redis-cache-model";
import {
	AppointmentStatusUpdateData,
	LawyerProfileUpdateData,
	LawyersStatusesUpdateData,
	NewAppointmentRequestData,
	ssEventsSchema
} from "../../common/ss-events-schema";
import {dateToDynamoDbStr, strToDate} from "../../common/utils/date-to-str";
import {BatchSendNotif_T, WsNotificationsHelper} from "../notifications/ws-notifications-helper";

export class SSEventsListener implements EventsListenerAPIImplementation<typeof ssEventsSchema> {
	constructor (private common: RedisCacheModel, private notifs: WsNotificationsHelper) {
	}

	async lawyerProfileUpdate (ev: ListenerEvent<LawyerProfileUpdateData>) {
		const params = ev.params;
		await this.common.invalidateLawyerCache(params.ids, {
			invalidateCaseSpecializations: params.invalidateCaseSpecializations === true
		});
	}

	async lawyersStatusesUpdate (ev: ListenerEvent<LawyersStatusesUpdateData>) {
		await this.notifs.sendNotifications([
			...ev.params.confirmed.map(id => ({
				userId:           id,
				sendingTimestamp: ev.timestamp,
				notification:     {
					type:   NotificationType.LawyerStatusUpdate,
					status: StatusEnum.Confirmed
				}
			} as BatchSendNotif_T)),
			...ev.params.waiting.map(id => ({
				userId:           id,
				sendingTimestamp: ev.timestamp,
				notification:     {
					type:   NotificationType.LawyerStatusUpdate,
					status: StatusEnum.Waiting
				}
			} as BatchSendNotif_T)),
			...ev.params.rejected.map(({id, reason}) => ({
				userId:           id,
				sendingTimestamp: ev.timestamp,
				notification:     {
					type:            NotificationType.LawyerStatusUpdate,
					status:          StatusEnum.Rejected,
					rejectionReason: reason
				}
			} as BatchSendNotif_T))
		]);
	}

	async newAppointmentRequest (ev: ListenerEvent<NewAppointmentRequestData>) {
		console.log("newAppointmentRequest: ", ev);
		await this.notifs.sendNotification(ev.params.lawyerId, strToDate(ev.params.openedOn), {
			type:               NotificationType.NewAppointmentRequest,
			appointmentId:      ev.params.appointmentId,
			trimmedDescription: ev.params.trimmedDescription,
			client:             ev.params.client,
		});
	}

	async appointmentStatusUpdate (ev: ListenerEvent<AppointmentStatusUpdateData>) {
		const {clientId, ...data} = ev.params;
		await this.notifs.sendNotification(ev.params.clientId, ev.timestamp, data.status === StatusEnum.Confirmed ? {
			type: NotificationType.AppointmentStatusUpdate,
			...data,
			timestamp: dateToDynamoDbStr(strToDate(data.timestamp)),
		} : {
			type: NotificationType.AppointmentStatusUpdate,
			...data
		});
	}
}
