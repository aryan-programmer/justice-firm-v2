import {getExpressionAttributeNames} from "./utils/functions";

export const connectionsByGroupIdIndex = "ConnectionsByGroupIdIndex";

export const ATTACHMENT_PATH   = "apath";
export const ATTACHMENT_MIME   = "amime";
export const ATTACHMENT_NAME   = "aname";
export const MESSAGE_GROUP     = "group";
export const MESSAGE_TIMESTAMP = "ts";
export const MESSAGE_TEXT      = "text";
export const MESSAGE_SENDER_ID = "from";
export const MESSAGE_ID        = "id";

export const SETTINGS_GROUP                = "group";
export const SETTINGS_UNREAD_NOTIFICATIONS = "unread";

export const CONNECTION_ID       = "id";
export const CONNECTION_GROUP_ID = "gid"; // Value depends on value of CONNECTION_TYPE

export class GroupIdFromType {
	static Chat (s: string) {
		return s;
	}

	static UserNotifications (s: string) {
		return "notif:" + s;
	}
}

export const SettingsTable_ExpressionAttributeNames = getExpressionAttributeNames([
	SETTINGS_GROUP,
	SETTINGS_UNREAD_NOTIFICATIONS,
]);

export const ConnectionsTable_ExpressionAttributeNames = getExpressionAttributeNames([
	CONNECTION_ID,
	CONNECTION_GROUP_ID,
]);
