import {FieldContext} from "vee-validate";
import {StatusEnum} from "../../common/db-types";
import {Nuly, Paths} from "../../common/utils/types";
import {MessageData} from "../../common/ws-chatter-box-api-schema";

export type SelectItemKey =
	| boolean
	| string
	| (string | number)[]
	| ((item: Record<string, any>, fallback?: any) => any);

export type DataTableHeader<TObject> = {
	key: Paths<TObject, 3>
	value?: SelectItemKey
	title: string
	colspan?: number
	rowspan?: number
	fixed?: boolean
	align?: 'end' | 'start' | 'center'
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

export type UploadFileWithDescriptionDialogEventData = {
	attachmentDataUrl: string,
	attachmentName: string,
	description: string | Nuly
};

export enum KeepAsIsEnum {
	KeepAsIs = "KeepAsIs"
}

export const StatusSelectionOptions = {
	...StatusEnum,
	...KeepAsIsEnum
};
export type StatusSelectionOptions = StatusEnum | KeepAsIsEnum;

export enum BtnVariants {
	Flat     = "flat",
	Text     = "text",
	Elevated = "elevated",
	Tonal    = "tonal",
	Outlined = "outlined",
	Plain    = "plain",
}

export type Density = 'default' | 'comfortable' | 'compact';
