export const connectionsByGroupIdIndex = "ConnectionsByGroupIdIndex";

export const ATTACHMENT_PATH   = "apath";
export const ATTACHMENT_MIME   = "amime";
export const ATTACHMENT_NAME   = "aname";
export const MESSAGE_GROUP     = "group";
export const MESSAGE_TIMESTAMP = "ts";
export const MESSAGE_TEXT      = "text";
export const MESSAGE_SENDER_ID = "from";
export const MESSAGE_ID        = "id";

export const CONNECTION_ID       = "id";
// export const CONNECTION_TYPE   = "type";
export const CONNECTION_GROUP_ID = "gid"; // Value depends on value of CONNECTION_TYPE

export class GroupIdFromType {
	static Chat (s: string) {
		return s;
	}

	static UserNotifications (s: string) {
		return "notif:" + s;
	}
}

export const ConnectionsTable_ExpressionAttributeNames = [
	CONNECTION_ID,
	// CONNECTION_TYPE,
	CONNECTION_GROUP_ID
].reduce((prev, curr) => {
	prev["#" + curr] = curr;
	return prev;
}, {} as Record<string, string>);
