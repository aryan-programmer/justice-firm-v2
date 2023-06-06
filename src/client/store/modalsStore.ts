import {reactive, ref, SemanticColorLevel, warningColor} from "#imports";
import {StorageSerializers, useLocalStorage} from "@vueuse/core";
import {EventEmitter} from "eventemitter3";
import {sample} from "lodash";
import {defineStore} from 'pinia';
import {Nuly} from "../../common/utils/types";
import {uniqId} from "../../common/utils/uniq-id";
import {BtnVariants, NotificationDataDisplayable} from "../utils/types";

export enum CloseType {
	Ok          = "Ok",
	// Cancel      = "Cancel",
	Dismissed   = "Dismissed",
	Overwritten = "Overwritten",
	TimedOut    = "TimedOut",
}

export type ModalData = {
	message: string;
	title: string;
	okBtnText: string;
	backgroundColor: string;
	okBtnColor: string;
	okBtnVariant: BtnVariants;
};

export type SnackbarBaseData = {
	textColor: string;
	backgroundColor: string;
	okBtnText: string;
	okBtnColor: string;
	okBtnVariant: BtnVariants;
	timeoutMs: number;
	id: string;
};
export type SnackbarDataWithMessage = SnackbarBaseData & {
	message: string;
};
export type SnackbarDataWithNotification = SnackbarBaseData & {
	notification: NotificationDataDisplayable
};
export type SnackbarData = SnackbarDataWithMessage | SnackbarDataWithNotification;

export type ModalOptions = Partial<ModalData & {
	type: 'modal' | Nuly
}>;
export type SnackbarOptionsWithMessage = Partial<Omit<SnackbarDataWithMessage, 'id' | 'showing'> & {
	type: 'snackbar' | Nuly,
}>;
export type SnackbarOptionsWithNotification = Partial<Omit<SnackbarDataWithNotification, 'id' | 'showing' | 'notification'> & {
	type: 'snackbar' | Nuly,
}>;

export const useModalStore = defineStore('ModalStore', () => {
	const isOpen              = ref<boolean>(false);
	const id                  = ref<string | Nuly>();
	const modalOptions        = reactive<{ modalOptions: ModalData | Nuly }>({modalOptions: null});
	const emitter             = new EventEmitter<{
		alertClose: (id: string, closeType: CloseType) => void,
		[vs: `snackbarClose${string}`]: (id: string, closeType: CloseType) => void
	}>();
	const snackbars           = ref<SnackbarData[]>([]);
	const messagesAsSnackbars = useLocalStorage<boolean>("ModalStore::MessagesAsSnackbars",
		true,
		{serializer: StorageSerializers.boolean});

	function showModal (data: ModalData) {
		return new Promise<CloseType>(resolve => {
			if (isOpen.value) {
				window.alert(modalOptions.modalOptions?.message);
				console.warn("Overwriting alert: ", modalOptions);
			}
			const thisId              = "alert-" + uniqId();
			modalOptions.modalOptions = data === modalOptions.modalOptions ? {...data} : data;
			isOpen.value              = true;
			id.value                  = thisId;
			emitter.once("alertClose", (id, closeType) => {
				if (id === thisId) {
					resolve(closeType);
				} else {
					resolve(CloseType.Overwritten);
				}
			});
		});
	}

	function closeCurrentModal (closeType: CloseType) {
		emitter.emit("alertClose", id.value ?? "", closeType);
		isOpen.value = false;
		id.value     = null;
	}

	function modalFullyClosed () {
		modalOptions.modalOptions = null;
	}

	function showSnackbar (data: SnackbarData) {
		return new Promise<CloseType>(resolve => {
			snackbars.value = [...snackbars.value, data];

			emitter.once(`snackbarClose${data.id}`, (id, closeType) => {
				if (id === data.id) {
					resolve(closeType);
				} else {
					console.log("Snackbar overwritten, should never happen.");
					resolve(CloseType.Overwritten);
				}
			});
		});
	}

	function closeSnackbarWithId (id: string, closeType: CloseType) {
		emitter.emit(`snackbarClose${id}`, id, closeType);
	}

	function snackbarWithIdFullyRemoved (id: string) {
		snackbars.value = snackbars.value.filter(value => value.id !== id);
	}

	return {
		isOpen,
		modalOptions,
		showModal,
		closeCurrentModal,
		modalFullyClosed,
		snackbars,
		messagesAsSnackbars,
		snackbarWithIdFullyRemoved,
		closeSnackbarWithId,
		showSnackbar,
	};
});

export type ModalStore_T = ReturnType<typeof useModalStore>;

export const defaultWarningBgColor       = warningColor;
export const defaultErrorBgColor         = "red-lighten-3";
export const defaultSuccessBgColors      = [
	"gradient--lemon-gate",
	"gradient--dusty-grass",
	"gradient--new-life",
	"gradient--morning-salad",
	"gradient--grass-shampoo",
];
export const defaultAlertBgColors        = [
	"gradient--landing-aircraft",
	"gradient--perfect-white",
	// "gradient--gagarin-view",
	"gradient--deep-light-blue",
	// "gradient--sharpeye-eagle",
	"gradient--kind-steel",
	"gradient--cochiti-lake",
	"gradient--confident-cloud",
	// "gradient--flying-lemon",
	"gradient--malibu-beach",
	"gradient--salt-mountain",
	"gradient--high-flight"
];
export const defaultAlertOptions         = {
	title:        "Justice Firm",
	okBtnVariant: BtnVariants.Tonal,
	okBtnText:    "OK",
	okBtnColor:   "teal-darken-4",
};
export const defaultErrorOptions         = {
	...defaultAlertOptions,
	title:        "Error",
	okBtnVariant: BtnVariants.Elevated,
	okBtnColor:   "purple-lighten-1",
};
export const defaultSnackbarTimeout      = 4000;
export const defaultSnackbarAlertOptions = {
	okBtnVariant: BtnVariants.Tonal,
	okBtnText:    "OK",
	okBtnColor:   "teal-darken-4",
	timeoutMs:    defaultSnackbarTimeout,
	textColor:    "black",
};
export const defaultSnackbarErrorOptions = {
	...defaultSnackbarAlertOptions,
	title:        "Error",
	okBtnVariant: BtnVariants.Elevated,
	okBtnColor:   "purple-lighten-1",
};

export function getBgColorFromSemanticLevel (level: SemanticColorLevel) {
	switch (level) {
	case SemanticColorLevel.Error:
		return defaultErrorBgColor;
	case SemanticColorLevel.Warning:
		return defaultWarningBgColor;
	case SemanticColorLevel.Info:
		return sample(defaultAlertBgColors)!;
	case SemanticColorLevel.Success:
		return sample(defaultSuccessBgColors)!;
	}
}

export class ModalStoreWrapper {
	constructor (private modalsStore: ModalStore_T) {
		this.message          = this.message.bind(this);
		this.error            = this.error.bind(this);
		this.errorMessage     = this.errorMessage.bind(this);
		this.showNotification = this.showNotification.bind(this);
	}

	showNotification (notification: NotificationDataDisplayable, opts?: SnackbarOptionsWithNotification) {
		const thisId          = "snackbar-notification-" + uniqId();
		const isErrOrWarning  = notification.level === SemanticColorLevel.Warning || notification.level === SemanticColorLevel.Error;
		const defaultOpts     = isErrOrWarning ? defaultSnackbarErrorOptions : defaultSnackbarAlertOptions;
		const backgroundColor = getBgColorFromSemanticLevel(notification.level);
		return this.modalsStore.showSnackbar({
			...defaultOpts,
			backgroundColor,
			notification,
			...opts,
			id: thisId,
		});
	}

	message (message: string, opts?: ModalOptions | SnackbarOptionsWithMessage) {
		if (opts?.message === 'snackbar' || this.modalsStore.messagesAsSnackbars) {
			const thisId = "snackbar-" + uniqId();

			return this.modalsStore.showSnackbar({
				...defaultSnackbarAlertOptions,
				backgroundColor: sample(defaultAlertBgColors)!,
				message,
				...opts,
				id: thisId,
			});
		} else {
			return this.modalsStore.showModal({
				...defaultAlertOptions,
				backgroundColor: sample(defaultAlertBgColors)!,
				message,
				...opts,
			});
		}
	}

	errorMessage (message: string, opts?: ModalOptions | SnackbarOptionsWithMessage) {
		if (opts?.message === 'snackbar' || this.modalsStore.messagesAsSnackbars) {
			const thisId = "snackbar-" + uniqId();

			return this.modalsStore.showSnackbar({
				...defaultSnackbarErrorOptions,
				backgroundColor: defaultErrorBgColor,
				message,
				...opts,
				id: thisId,
			});
		} else {
			return this.modalsStore.showModal({
				...defaultErrorOptions,
				backgroundColor: defaultErrorBgColor,
				message,
				...opts,
			});
		}
	}

	error (message: string, opts?: ModalOptions) {
		return this.modalsStore.showModal({
			...defaultErrorOptions,
			backgroundColor: sample(defaultAlertBgColors)!,
			message,
			...opts,
		});
	}
}

export function useModals () {
	const modalsStore = useModalStore();
	return new ModalStoreWrapper(modalsStore);
}
