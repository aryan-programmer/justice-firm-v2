import {AttributeValue} from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
import {UserAccessType} from "../../../common/db-types";
import {
	ATTACHMENT_MIME,
	ATTACHMENT_NAME,
	ATTACHMENT_PATH,
	MESSAGE_GROUP,
	MESSAGE_ID,
	MESSAGE_TIMESTAMP,
} from "../../../common/infrastructure-constants";
import {NotificationMessageData, NotificationType, UserNotification} from "../../../common/notification-types";
import {nn} from "../../../common/utils/asserts";
import {StatusEnum} from "../../../common/utils/constants";
import {getExpressionAttributeNames, isNullOrEmpty} from "../../../common/utils/functions";
import {Nuly} from "../../../common/utils/types";

const NOTIFICATION_TYPE = "ntyp";
const NOTIFICATION_DATA = "ndat";

const AppointmentId      = "aid";
const TrimmedDescription = "desc";
const ClientId           = "cid";
const ClientName         = "cname";
const LawyerId           = "lid";
const LawyerName         = "lname";

const LawyerStatusUpdate_Status          = "lsu:st";
const LawyerStatusUpdate_RejectionReason = "lsu:rej";

const AppointmentStatusUpdate_Status    = "sts";
const AppointmentStatusUpdate_Timestamp = "ts";

const CaseUpgradeFromAppointment_TrimmedCaseDescription = TrimmedDescription;
const CaseId                                            = "csid";

const CaseDocumentUploaded_CaseDocumentId             = "csdid";
const CaseDocumentUploaded_TrimmedDocumentDescription = TrimmedDescription;
const CaseDocumentUploaded_SenderId                   = "sid";
const CaseDocumentUploaded_SenderName                 = "sname";
const CaseDocumentUploaded_SenderType                 = "styp";
const CaseDocumentUploaded_DocumentPath               = ATTACHMENT_PATH;
const CaseDocumentUploaded_DocumentMime               = ATTACHMENT_MIME;
const CaseDocumentUploaded_DocumentName               = ATTACHMENT_NAME;

export const GetNotifications_ProjectionExpression     = [
	MESSAGE_TIMESTAMP, MESSAGE_ID, NOTIFICATION_TYPE, NOTIFICATION_DATA
].map(v => "#" + v).join(",");
export const GetNotifications_EAV_CNeedGroup           = ":needGroup";
export const GetNotifications_KeyConditionExpression   = `#${MESSAGE_GROUP} = ${GetNotifications_EAV_CNeedGroup}`;
export const GetNotifications_ExpressionAttributeNames = getExpressionAttributeNames([
	MESSAGE_GROUP,
	MESSAGE_TIMESTAMP, MESSAGE_ID, NOTIFICATION_TYPE, NOTIFICATION_DATA
]);

function getStringFieldIf (name: string, value: string | Nuly, condition: boolean = true): Record<string, AttributeValue> {
	return !isNullOrEmpty(value) && condition ? {
		[name]: {S: value},
	} : {};
}

function notificationDataToDynamodbMap (
	data: NotificationMessageData,
): Record<string, AttributeValue> {
	const notification = data.notification;
	switch (notification.type) {
	case NotificationType.LawyerStatusUpdate:
		return {
			[LawyerStatusUpdate_Status]: {S: notification.status},
			...getStringFieldIf(
				LawyerStatusUpdate_RejectionReason,
				notification.rejectionReason
			),
		};
	case NotificationType.NewAppointmentRequest:
		return {
			[AppointmentId]:      {S: notification.appointmentId},
			[TrimmedDescription]: {S: notification.trimmedDescription},
			[ClientId]:           {S: notification.client.id},
			[ClientName]:         {S: notification.client.name},
		};
	case NotificationType.AppointmentStatusUpdate:
		if (notification.status === StatusEnum.Rejected) {
			return {
				[AppointmentId]:                  {S: notification.appointmentId},
				[AppointmentStatusUpdate_Status]: {S: notification.status},
				[LawyerId]:                       {S: notification.lawyer.id},
				[LawyerName]:                     {S: notification.lawyer.name},
			};
		} else {
			return {
				[AppointmentId]:                     {S: notification.appointmentId},
				[AppointmentStatusUpdate_Status]:    {S: notification.status},
				[AppointmentStatusUpdate_Timestamp]: {S: notification.timestamp},
				[LawyerId]:                          {S: notification.lawyer.id},
				[LawyerName]:                        {S: notification.lawyer.name},
			};
		}
		break;
	case NotificationType.CaseUpgradeFromAppointment:
		return {
			[AppointmentId]: {S: notification.appointmentId},
			[LawyerId]:      {S: notification.lawyer.id},
			[LawyerName]:    {S: notification.lawyer.name},

			[CaseUpgradeFromAppointment_TrimmedCaseDescription]: {S: notification.trimmedCaseDescription},
			[CaseId]:                                            {S: notification.caseId},
		};
	case NotificationType.CaseDocumentUploaded:
		return {
			[CaseDocumentUploaded_CaseDocumentId]:             {S: notification.caseDocumentId},
			[CaseDocumentUploaded_TrimmedDocumentDescription]: {S: notification.trimmedDocumentDescription},
			[CaseDocumentUploaded_SenderId]:                   {S: notification.sender.id},
			[CaseDocumentUploaded_SenderName]:                 {S: notification.sender.name},
			[CaseDocumentUploaded_SenderType]:                 {S: notification.sender.type},
			[CaseDocumentUploaded_DocumentPath]:               {S: notification.documentUploadData.path},
			[CaseDocumentUploaded_DocumentMime]:               {S: notification.documentUploadData.mime},
			[CaseId]:                                          {S: notification.caseId},
			...getStringFieldIf(
				CaseDocumentUploaded_DocumentName,
				notification.documentUploadData.name
			),
		};
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
			trimmedDescription: nn(data[TrimmedDescription].S),
			client:             {
				id:   nn(data[ClientId].S),
				name: nn(data[ClientName].S),
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
					id:   nn(data[LawyerId].S),
					name: nn(data[LawyerName].S),
				},
			};
		} else {
			return {
				type,
				appointmentId: nn(data[AppointmentId].S),
				status:        StatusEnum.Rejected,
				lawyer:        {
					id:   nn(data[LawyerId].S),
					name: nn(data[LawyerName].S),
				},
			};
		}
	case NotificationType.CaseUpgradeFromAppointment:
		return {
			type,
			appointmentId:          nn(data[AppointmentId].S),
			caseId:                 nn(data[CaseId].S),
			lawyer:                 {
				id:   nn(data[LawyerId].S),
				name: nn(data[LawyerName].S),
			},
			trimmedCaseDescription: nn(data[CaseUpgradeFromAppointment_TrimmedCaseDescription].S),
		};
	case NotificationType.CaseDocumentUploaded:
		return {
			type,
			caseDocumentId:             nn(data[CaseDocumentUploaded_CaseDocumentId].S),
			trimmedDocumentDescription: nn(data[CaseDocumentUploaded_TrimmedDocumentDescription].S),
			sender:                     {
				id:   nn(data[CaseDocumentUploaded_SenderId].S),
				name: nn(data[CaseDocumentUploaded_SenderName].S),
				type: nn(data[CaseDocumentUploaded_SenderType].S) as UserAccessType,
			},
			documentUploadData:         {
				path: nn(data[CaseDocumentUploaded_DocumentPath].S),
				mime: nn(data[CaseDocumentUploaded_DocumentMime].S),
				name: data[CaseDocumentUploaded_DocumentName].S ?? undefined,
			},
			caseId:                     nn(data[CaseId].S),
		};
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
