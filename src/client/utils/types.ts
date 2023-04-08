import {MessageData} from "../../common/ws-api-schema";

export type SelectItemKey =
	| boolean
	| string
	| (string | number)[]
	| ((item: Record<string, any>, fallback?: any) => any);

export type DataTableHeader<TObject> = {
	key: keyof TObject
	value?: SelectItemKey
	title: string
	colspan?: number
	rowspan?: number
	fixed?: boolean
	align?: 'end' | 'start'
	width?: number
	minWidth?: string
	maxWidth?: string
	sortable?: boolean
	sort?: (a: any, b: any) => number
};

export type MessageDataDisplayable = MessageData & {
	isMe: boolean,
	first: boolean,
	last: boolean,
	timeString: string,
};
