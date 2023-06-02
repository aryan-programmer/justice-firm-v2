import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {MESSAGE_GROUP, MESSAGE_ID, MESSAGE_TIMESTAMP,} from "../../../common/infrastructure-constants";
import {NotificationMessageData, NotificationType, UserNotification} from "../../../common/notification-types";
import {nn} from "../../../common/utils/asserts";
import {StatusEnum} from "../../../common/utils/constants";
import {isNullOrEmpty} from "../../../common/utils/functions";

const NOTIFICATION_TYPE = "ntyp";
const NOTIFICATION_DATA = "ndat";

const LawyerStatusUpdate_Status          = "lsu:st";
const LawyerStatusUpdate_RejectionReason = "lsu:rej";

const AppointmentId                            = "aid";
const NewAppointmentRequest_TrimmedDescription = "desc";
const NewAppointmentRequest_ClientId           = "cid";
const NewAppointmentRequest_ClientName         = "cname";

const AppointmentStatusUpdate_Status     = "sts";
const AppointmentStatusUpdate_Timestamp  = "ts";
const AppointmentStatusUpdate_LawyerId   = "lid";
const AppointmentStatusUpdate_LawyerName = "lname";

export const GetNotifications_ProjectionExpression     = [
	MESSAGE_TIMESTAMP, MESSAGE_ID, NOTIFICATION_TYPE, NOTIFICATION_DATA
].map(v => "#" + v).join(",");
export const GetNotifications_EAV_CNeedGroup           = ":needGroup";
export const GetNotifications_KeyConditionExpression   = `#${MESSAGE_GROUP} = ${GetNotifications_EAV_CNeedGroup}`;
export const GetNotifications_ExpressionAttributeNames = [
	MESSAGE_GROUP,
	MESSAGE_TIMESTAMP, MESSAGE_ID, NOTIFICATION_TYPE, NOTIFICATION_DATA
].reduce((prev, curr) => {
	prev["#" + curr] = curr;
	return prev;
}, {} as Record<string, string>);

function notificationDataToDynamodbMap (
	data: NotificationMessageData,
): Record<string, AttributeValue> {
	const notification = data.notification;
	switch (notification.type) {
	case NotificationType.LawyerStatusUpdate:
		if (isNullOrEmpty(notification.rejectionReason)) {
			return {
				[LawyerStatusUpdate_Status]: {S: notification.status}
			};
		} else {
			return {
				[LawyerStatusUpdate_Status]:          {S: notification.status},
				[LawyerStatusUpdate_RejectionReason]: {S: notification.rejectionReason}
			};
		}
		break;
	case NotificationType.NewAppointmentRequest:
		return {
			[AppointmentId]:                            {S: notification.appointmentId},
			[NewAppointmentRequest_TrimmedDescription]: {S: notification.trimmedDescription},
			[NewAppointmentRequest_ClientId]:           {S: notification.client.id},
			[NewAppointmentRequest_ClientName]:         {S: notification.client.name},
		};
	case NotificationType.AppointmentStatusUpdate:
		if (notification.status === StatusEnum.Rejected) {
			return {
				[AppointmentId]:                      {S: notification.appointmentId},
				[AppointmentStatusUpdate_Status]:     {S: notification.status},
				[AppointmentStatusUpdate_LawyerId]:   {S: notification.lawyer.id},
				[AppointmentStatusUpdate_LawyerName]: {S: notification.lawyer.name},
			};
		} else {
			return {
				[AppointmentId]:                      {S: notification.appointmentId},
				[AppointmentStatusUpdate_Status]:     {S: notification.status},
				[AppointmentStatusUpdate_Timestamp]:  {S: notification.timestamp},
				[AppointmentStatusUpdate_LawyerId]:   {S: notification.lawyer.id},
				[AppointmentStatusUpdate_LawyerName]: {S: notification.lawyer.name},
			};
		}
		break;
	}
}

export function notificationToDynamoDbRecord (
	data: NotificationMessageData,
): Record<string, AttributeValue> {
	const notification = data.notification;
	return {
		[MESSAGE_GROUP]:     {S: data.groupId},
		[NOTIFICATION_TYPE]: {S: notification.type},
		[NOTIFICATION_DATA]: {M: notificationDataToDynamodbMap(data)},
		[MESSAGE_ID]:        {S: data.id},
		[MESSAGE_TIMESTAMP]: {S: data.timestamp},
	};
}

function dynamodbMapToNotificationData (
	type: NotificationType,
	data: Record<string, AttributeValue>,
): UserNotification {
	switch (type) {
	case NotificationType.LawyerStatusUpdate:
		const rejectionReason = data[LawyerStatusUpdate_RejectionReason]?.S;
		if (isNullOrEmpty(rejectionReason)) {
			return {
				type,
				status: nn(data[LawyerStatusUpdate_Status].S) as StatusEnum,
			};
		} else {
			return {
				type,
				status: nn(data[LawyerStatusUpdate_Status].S) as StatusEnum,
				rejectionReason
			};
		}
		break;
	case NotificationType.NewAppointmentRequest:
		return {
			type,
			appointmentId:      nn(data[AppointmentId].S),
			trimmedDescription: nn(data[NewAppointmentRequest_TrimmedDescription].S),
			client:             {
				id:   nn(data[NewAppointmentRequest_ClientId].S),
				name: nn(data[NewAppointmentRequest_ClientName].S),
			},
		};
	case NotificationType.AppointmentStatusUpdate:
		const status = nn(data[AppointmentStatusUpdate_Status].S);
		if (status === StatusEnum.Confirmed) {
			return {
				type,
				appointmentId: nn(data[AppointmentId].S),
				status,
				timestamp:     nn(data[AppointmentStatusUpdate_Timestamp].S),
				lawyer:        {
					id:   nn(data[AppointmentStatusUpdate_LawyerId].S),
					name: nn(data[AppointmentStatusUpdate_LawyerName].S),
				},
			};
		} else {
			return {
				type,
				appointmentId: nn(data[AppointmentId].S),
				status:        StatusEnum.Rejected,
				lawyer:        {
					id:   nn(data[AppointmentStatusUpdate_LawyerId].S),
					name: nn(data[AppointmentStatusUpdate_LawyerName].S),
				},
			};
		}
	}
}

export function dynamoDbRecordToNotification (
	groupId: string,
	data: Record<string, AttributeValue>,
): NotificationMessageData {
	return {
		groupId:      groupId,
		timestamp:    nn(data[MESSAGE_TIMESTAMP].S),
		id:           nn(data[MESSAGE_ID].S),
		notification: dynamodbMapToNotificationData(
			nn(data[NOTIFICATION_TYPE].S) as NotificationType,
			nn(data[NOTIFICATION_DATA].M)
		)
	};
}
