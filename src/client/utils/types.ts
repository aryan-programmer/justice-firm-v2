import {FieldContext} from "vee-validate";
import {StatusEnum} from "../../common/db-types";
import {NotificationMessageData} from "../../common/notification-types";
import {Nuly, Paths} from "../../common/utils/types";
import {MessageData} from "../../common/ws-chatter-box-api-schema";

export type SelectItemKey =
	| boolean
	| string
	| (string | number)[]
	| ((item: Record<string, any>, fallback?: any) => any);

export type DataTableCompareFunction<T = any> = (a: T, b: T) => number;
export type TypedDataTableHeader<TObject> = {
	key: Paths<TObject, 3>
	value?: SelectItemKey
	title: string
	colspan?: number
	rowspan?: number
	fixed?: boolean
	// v-data-table supports center alignment (I've checked),
	// but it is not specified in the TS definitions,
	// so TypedDataTableHeader needs to be cast to unknown then to DataTableHeader
	// This is normal since v-data-table is a part of Vuetify Labs
	align?: 'end' | 'start' | 'center';
	width?: number
	minWidth?: string
	maxWidth?: string
	sortable?: boolean
	sort?: DataTableCompareFunction
};

// Type definition for DataTableHeader for v-data-table from Vuetify internal .ts files
export type DataTableHeader = {
	key: string;
	value?: SelectItemKey;
	title: string;
	colspan?: number;
	rowspan?: number;
	fixed?: boolean;
	align?: 'start' | 'end';
	width?: number;
	minWidth?: string;
	maxWidth?: string;
	sortable?: boolean;
	sort?: DataTableCompareFunction;
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

export enum SemanticColorLevel {
	Error   = 'error',
	Warning = 'warning',
	Info    = 'info',
	Success = 'success',
}

export type NotificationDataDisplayable = Omit<NotificationMessageData, "timestamp"> & {
	timestamp: Date,
	text: string,
	link?: string,
	level: SemanticColorLevel,
	dateStrings: {
		date: string,
		time: string,
		dateTime: string,
	},
	levelColor: string,
	icon?: string,
};
