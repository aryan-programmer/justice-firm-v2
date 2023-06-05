<script setup lang="ts">
import {watch} from "#imports";
import {StatusEnum} from "../../../common/db-types";
import {nullOrEmptyCoalesce} from "../../../common/utils/functions";
import {useLawyerStatusCheckerStore} from "../../store/lawyerStatusCheckerStore";
import {useModals} from "../../store/modalsStore";

const lawyerStatusCheckerStore = useLawyerStatusCheckerStore();
const {message, errorMessage}  = useModals();
watch(() => lawyerStatusCheckerStore.shouldDisplayStatus, async value => {
	if (lawyerStatusCheckerStore.shouldDisplayStatus && lawyerStatusCheckerStore.status != null) {
		const status = lawyerStatusCheckerStore.status;
		switch (status.status) {
		case StatusEnum.Rejected:
			await errorMessage("Your application has been rejected for the following reason(s): " +
			                   nullOrEmptyCoalesce(status.rejectionReason, "Unknown reason"), {
				timeoutMs: 15000
			});
			break;
		case StatusEnum.Confirmed:
			await message("Your application has been confirmed", {
				timeoutMs: 10000
			});
			break;
		case StatusEnum.Waiting:
			await errorMessage("Warning: Your application is in the waiting state", {
				timeoutMs: 15000
			});
			break;
		}
		lawyerStatusCheckerStore.showedPopup();
	}
}, {immediate: true});
</script>

<template>

</template>
