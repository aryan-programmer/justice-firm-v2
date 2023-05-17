import {reactive, ref} from "#imports";
import {StorageSerializers, useLocalStorage} from "@vueuse/core";
import {EventEmitter} from "eventemitter3";
import {sample} from "lodash";
import {defineStore} from 'pinia'
import {Nuly} from "../../common/utils/types";
import {uniqId} from "../../common/utils/uniq-id";
import {BtnVariants} from "../utils/types";

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

export type SnackbarData = {
	message: string;
	textColor: string;
	backgroundColor: string;
	okBtnText: string;
	okBtnColor: string;
	okBtnVariant: BtnVariants;
	timeoutMs: number;
	id: string;
};

export type ModalOptions = Partial<ModalData & {
	type: 'modal' | Nuly
}>;
export type SnackbarOptions = Partial<Omit<SnackbarData, 'id' | 'showing'> & {
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

export const defaultAlertBgColors        = [
	"gradient--landing-aircraft",
	"gradient--perfect-white",
	"gradient--gagarin-view",
	"gradient--deep-light-blue",
	"gradient--sharpeye-eagle",
	"gradient--lemon-gate",
	"gradient--kind-steel",
	"gradient--cochiti-lake",
	"gradient--confident-cloud",
	"gradient--flying-lemon",
	"gradient--morning-salad"
];
export const defaultAlertOptions         = {
	title:        "Justice Firm",
	okBtnVariant: BtnVariants.Tonal,
	okBtnText:    "OK",
	okBtnColor:   "green-darken-4",
};
export const defaultErrorOptions         = {
	...defaultAlertOptions,
	title:        "Error",
	okBtnVariant: BtnVariants.Elevated,
	okBtnColor:   "red-lighten-1",
};
export const defaultSnackbarAlertOptions = {
	okBtnVariant: BtnVariants.Tonal,
	okBtnText:    "OK",
	okBtnColor:   "green-darken-4",
	timeoutMs:    4000,
	textColor:    "black",
};
export const defaultSnackbarErrorOptions = {
	...defaultSnackbarAlertOptions,
	title:        "Error",
	okBtnVariant: BtnVariants.Elevated,
	okBtnColor:   "red-lighten-1",
};

export class ModalStoreWrapper {
	constructor (private modalsStore: ModalStore_T) {
		this.message      = this.message.bind(this);
		this.error        = this.error.bind(this);
		this.errorMessage = this.errorMessage.bind(this);
	}

	message (message: string, opts?: ModalOptions | SnackbarOptions) {
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

	errorMessage (message: string, opts?: ModalOptions | SnackbarOptions) {
		if (opts?.message === 'snackbar' || this.modalsStore.messagesAsSnackbars) {
			const thisId = "snackbar-" + uniqId();

			return this.modalsStore.showSnackbar({
				...defaultSnackbarErrorOptions,
				backgroundColor: "red-lighten-4",
				message,
				...opts,
				id: thisId,
			});
		} else {
			return this.modalsStore.showModal({
				...defaultErrorOptions,
				backgroundColor: sample(defaultAlertBgColors)!,
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
