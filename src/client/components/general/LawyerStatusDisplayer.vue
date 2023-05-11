<script setup lang="ts">
import {StatusEnum} from "../../../common/db-types";
import {nullOrEmptyCoalesce} from "../../../common/utils/functions";
import {useLawyerStatusCheckerStore} from "../../store/lawyerStatusCheckerStore";
import {useModals} from "../../store/modalsStore";

const lawyerStatusCheckerStore = useLawyerStatusCheckerStore();
const {message, error}         = useModals();
watch(() => lawyerStatusCheckerStore.shouldDisplayStatus, async value => {
	if (lawyerStatusCheckerStore.shouldDisplayStatus && lawyerStatusCheckerStore.status != null) {
		const status = lawyerStatusCheckerStore.status;
		switch (status.status) {
		case StatusEnum.Rejected:
			await error("Your application has been rejected for the following reason(s): " +
			            nullOrEmptyCoalesce(status.rejectionReason, "Unknown reason"), {
				title: "Lawyer application status update"
			});
			break;
		case StatusEnum.Confirmed:
			await message("Your application has been confirmed", {
				title: "Lawyer application status update"
			});
			break;
		case StatusEnum.Waiting:
			await error("Warning: Your application is in the waiting state", {
				title: "Lawyer application status update"
			});
			break;
		}
		lawyerStatusCheckerStore.showedPopup();
	}
}, {immediate: true});
</script>

<template>

</template>
