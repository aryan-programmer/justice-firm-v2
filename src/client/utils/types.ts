import {FieldContext} from "vee-validate";
import {StatusEnum} from "../../common/db-types";
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

export type FormTextFieldData = {
	field: FieldContext,
	label: string,
	cols: number,
	lg: number,
	type: string,
};

export enum KeepAsIsEnum {
	KeepAsIs = "KeepAsIs"
}

export const StatusSelectionOptions = {
	...StatusEnum,
	...KeepAsIsEnum
};
export type StatusSelectionOptions = StatusEnum | KeepAsIsEnum;

export type BtnVariants = "flat" | "text" | "elevated" | "tonal" | "outlined" | "plain";
