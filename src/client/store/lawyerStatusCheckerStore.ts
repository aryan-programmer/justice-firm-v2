import {navigateTo} from "#imports";
import {StorageSerializers, useLocalStorage} from "@vueuse/core";
import {isLeft} from "fp-ts/Either";
import {defineStore} from 'pinia';
import {UserAccessType} from "../../common/db-types";
import {GetLawyerStatusOutput} from "../../common/rest-api-schema";
import {StatusEnum} from "../../common/utils/constants";
import {Nuly} from "../../common/utils/types";
import {useModals} from "./modalsStore";
import {useUserStore} from "./userStore";

export const useLawyerStatusCheckerStore = defineStore('LawyerStatusCheckerStore', () => {
	const pastStatus              = useLocalStorage<GetLawyerStatusOutput | Nuly>("LawyerStatusCheckerStore::PastStatus",
		null,
		{serializer: StorageSerializers.object});
	const shouldDisplayStatus     = useLocalStorage<boolean>("LawyerStatusCheckerStore::ShouldDisplayStatus",
		false,
		{serializer: StorageSerializers.boolean});
	const shouldSuppressNextPopup = ref<boolean>();
	const userStore               = useUserStore();
	const {message, error}        = useModals();
	userStore.$subscribe(async mutation => {
		const authToken = userStore.authToken;
		if (authToken == null || authToken.userType !== UserAccessType.Lawyer) {
			pastStatus.value = null;
			return;
		}
		const res = await justiceFirmApi.getLawyerStatusInformation({id: authToken.id});
		if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
			console.log(res);
			await navigateTo("/");
			await error("Failed to get your status information");
			return;
		}
		const newStatus = res.right.body;
		console.log(newStatus, pastStatus.value, {
			v1: pastStatus.value?.status !== newStatus.status,
			v2:
			    pastStatus.value?.rejectionReason !== newStatus.rejectionReason
		});
		if (pastStatus.value == null) {
			pastStatus.value = newStatus;
			if (shouldSuppressNextPopup.value) {
				shouldSuppressNextPopup.value = false;
			} else if (newStatus.status !== StatusEnum.Confirmed) {
				shouldDisplayStatus.value = true;
			}
		} else {
			if (pastStatus.value.status !== newStatus.status || (
				pastStatus.value.status === StatusEnum.Rejected &&
				pastStatus.value.rejectionReason !== newStatus.rejectionReason
			)) {
				pastStatus.value          = newStatus;
				shouldDisplayStatus.value = true;
			} else {
				pastStatus.value = newStatus;
			}
		}
	}, {immediate: true});

	function showedPopup () {
		shouldDisplayStatus.value = false;
	}

	function suppressNextPopup () {
		shouldSuppressNextPopup.value = true;
	}

	return {
		status: pastStatus,
		shouldDisplayStatus,
		showedPopup,
		suppressNextPopup
	};
});
