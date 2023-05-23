export const connectionsByKeyIdIndex = "ConnectionsByKeyIdIndex";

export const ATTACHMENT_PATH   = "apath";
export const ATTACHMENT_MIME   = "amime";
export const ATTACHMENT_NAME   = "aname";
export const MESSAGE_GROUP     = "group";
export const MESSAGE_TIMESTAMP = "ts";
export const MESSAGE_TEXT      = "text";
export const MESSAGE_SENDER_ID = "from";
export const MESSAGE_ID        = "id";

export const CONNECTION_ID     = "id";
export const CONNECTION_TYPE   = "type";
export const CONNECTION_KEY_ID = "kid"; // Value depends on value of CONNECTION_TYPE

export enum ConnectionTypeOptions {
	ChatGroupConnection        = "1",
	UserNotificationConnection = "2",
}

export const ConnectionsTable_ExpressionAttributeNames = [
	CONNECTION_ID,
	CONNECTION_TYPE,
	CONNECTION_KEY_ID
].reduce((prev, curr) => {
	prev["#" + curr] = curr;
	return prev;
}, {} as Record<string, string>);
