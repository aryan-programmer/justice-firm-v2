import {Ref} from "@vue/reactivity";
import {isLeft, isRight} from "fp-ts/Either";
import {StatusEnum} from "../../common/db-types";
import {AppointmentSparseData} from "../../common/rest-api-schema";
import {assert, nn} from "../../common/utils/asserts";
import {
	invalidImageMimeTypeMessage,
	maxDataUrlLen,
	maxFileSize,
	validImageMimeTypes
} from "../../common/utils/constants";
import {timeFormat} from "../../common/utils/functions";
import {Nuly, Writeable} from "../../common/utils/types";
import {MessageData} from "../../common/ws-chatter-box-api-schema";
import {strToDate} from "../../server/common/utils/date-to-str";
import {FileUploadData} from "../../server/common/utils/types";
import {Message} from "../../singularity/helpers";
import {ModelResponseOrErr} from "../../singularity/model.client";
import {ModalStoreWrapper} from "../store/modalsStore";
import {UserStore_T} from "../store/userStore";
import {justiceFirmApi} from "./api-fetcher-impl";
import {confirmedColor, iconClassesArray, rejectedColor, waitingColor} from "./constants";
import {KeepAsIsEnum, MessageDataDisplayable, StatusSelectionOptions} from "./types";

export class FileReaderEventError extends Error {
	public readonly event: ProgressEvent<FileReader>;


	constructor (message: string, event: ProgressEvent<FileReader>) {
		super(message);
		this.event = event;
	}
}

export function readFileAsDataUrl (file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const fileReader = new FileReader();
		const fileName   = file.name;
		fileReader.addEventListener('load', () => {
			const res = fileReader.result;
			assert(typeof res === "string");
			resolve(res);
		});
		const listener = (ev: ProgressEvent<FileReader>) => {
			reject(new FileReaderEventError(`Failed to read file ${fileName}`, ev));
		};
		fileReader.addEventListener("error", listener);
		fileReader.addEventListener("abort", listener);
		fileReader.readAsDataURL(file);
	})
}

export async function fetchAppointmentsIntoRefByUserType (
	options: {
		status: StatusEnum,
		orderByOpenedOn: boolean,
		appointmentsRef: Ref<AppointmentSparseData[] | Nuly>,
		areAppointmentsLoadingRef: Ref<boolean>;
		userStore: UserStore_T,
		modals: ModalStoreWrapper,
	},
) {
	const {
		      status,
		      orderByOpenedOn,
		      appointmentsRef,
		      areAppointmentsLoadingRef,
		      userStore,
		      modals,
	      }                         = options;
	areAppointmentsLoadingRef.value = true;
	const res                       = await justiceFirmApi.getAppointments({
		withStatus: status,
		orderByOpenedOn,
		authToken:  nn(userStore.authToken)
	});
	areAppointmentsLoadingRef.value = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		modals.error/*not-awaiting*/(`Failed to get ${status} appointment requests`);
		return;
	}
	if ("message" in res.right.body) {
		console.log(res);
		modals.error/*not-awaiting*/(`Failed to get ${status} appointment requests: ${res.right.body.message}`);
		return;
	}
	appointmentsRef.value = res.right.body;
}


export async function fetchCasesIntoRef (
	casesRef: Ref<AppointmentSparseData[] | Nuly>,
	isLoadingRef: Ref<boolean>,
	userStore: UserStore_T,
	modals: ModalStoreWrapper,
) {
	isLoadingRef.value = true;
	const res          = await justiceFirmApi.getCasesData({
		authToken: nn(userStore.authToken)
	});
	isLoadingRef.value = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		await modals.error(`Failed to get cases`);
		return;
	}
	if ("message" in res.right.body) {
		console.log(res);
		await modals.error(`Failed to get cases: ${res.right.body.message}`);
		return;
	}
	casesRef.value = res.right.body;
}

export async function fetchAppointmentsByCategory (
	options: {
		modals: ModalStoreWrapper;
		userStore: UserStore_T;
		waitingAppointments: Ref<AppointmentSparseData[] | Nuly>;
		confirmedAppointments: Ref<AppointmentSparseData[] | Nuly>;
		rejectedAppointments: Ref<AppointmentSparseData[] | Nuly>;
		areWaitingAppointmentsLoading: Ref<boolean>;
		areConfirmedAppointmentsLoading: Ref<boolean>;
		areRejectedAppointmentsLoading: Ref<boolean>;
	}
) {
	const {
		      modals,
		      userStore,
		      waitingAppointments,
		      confirmedAppointments,
		      rejectedAppointments,
		      areWaitingAppointmentsLoading,
		      areConfirmedAppointmentsLoading,
		      areRejectedAppointmentsLoading,
	      }                              = options;
	areRejectedAppointmentsLoading.value = true;
	await Promise.all([
		fetchAppointmentsIntoRefByUserType({
			appointmentsRef:           waitingAppointments,
			areAppointmentsLoadingRef: areWaitingAppointmentsLoading,
			orderByOpenedOn:           true,
			status:                    StatusEnum.Waiting,
			modals,
			userStore
		}),
		fetchAppointmentsIntoRefByUserType({
			appointmentsRef:           confirmedAppointments,
			areAppointmentsLoadingRef: areConfirmedAppointmentsLoading,
			orderByOpenedOn:           false,
			status:                    StatusEnum.Confirmed,
			modals,
			userStore
		}),
	]);
	await fetchAppointmentsIntoRefByUserType({
		appointmentsRef:           rejectedAppointments,
		areAppointmentsLoadingRef: areRejectedAppointmentsLoading,
		orderByOpenedOn:           true,
		status:                    StatusEnum.Rejected,
		modals,
		userStore
	});
}

export function forceRipple ($el: HTMLElement) {
	return new Promise<void>(resolve => {
		let ev     = new Event("mousedown") as Writeable<MouseEvent>;
		let offset = $el.getBoundingClientRect();
		ev.clientX = offset.left + offset.width / 2;
		ev.clientY = offset.top + offset.height / 2;
		$el.dispatchEvent(ev);

		setTimeout(function () {
			$el.dispatchEvent(new Event("mouseup"));
			resolve();
		}, 300);
	})
}

export async function validateDataUrlAsPhotoBrowserSide (dataUrl: string, modals: ModalStoreWrapper) {
	if (dataUrl.length > maxDataUrlLen) {
		await modals.error(`The file must be less than ${maxFileSize} in size.`)
	}
	const response = await fetch(dataUrl);
	const fileType = response.headers.get("Content-Type") ?? "text/plain";
	if (fileType != null && validImageMimeTypes.includes(fileType)) {
		return true;
	} else {
		await modals.error(invalidImageMimeTypeMessage)
	}
	return false;
}

export function messageDataToDisplayable (
	messages: MessageData[],
	userStore: UserStore_T
): MessageDataDisplayable[] {
	const myId = userStore.authToken?.id;
	const res  = messages.map((msg, i) => {
		const prev = messages[i - 1];
		const next = messages[i + 1];
		return {
			...msg,
			tsInt:      +msg.ts,
			first:      prev == null || prev.from !== msg.from,
			last:       next == null || next.from !== msg.from,
			isMe:       msg.from === myId,
			timeString: timeFormat(strToDate(msg.ts))!
		}
	});
	res.sort((a, b) => a.tsInt - b.tsInt);
	return res;
}

export function getColorFromStatus (status: StatusEnum | Nuly) {
	switch (status) {
	case StatusEnum.Rejected:
		return rejectedColor;
	case StatusEnum.Confirmed:
		return confirmedColor;
	default:
		return waitingColor;
	}
}

export function getFontAwesomeIconFromMIME (mimeType: string) {
	for (const keyVal of iconClassesArray) {
		if (mimeType.startsWith(keyVal[0])) {
			return keyVal[1];
		}
	}
	return "fa-file";
}

export function isFilePreviewable (file: FileUploadData) {
	return file.mime.startsWith('image/');
}

export function statusSelectionOptionCoalesce (v1: StatusSelectionOptions | Nuly, v2: StatusEnum) {
	return v1 == null || v1 === KeepAsIsEnum.KeepAsIs ? v2 : v1;
}

export function withMessageBodyIfApplicable<T> (msg: string, res: ModelResponseOrErr<T | Message>) {
	if (isRight(res) && !res.right.ok && res.right.body != null) {
		if ((typeof res.right.body === "object" || typeof res.right.body === "function") && "message" in res.right.body) {
			return msg + ": " + res.right.body.message;
		} else {
			return msg + ": " + res.right.body;
		}
	}
	return msg;
}
