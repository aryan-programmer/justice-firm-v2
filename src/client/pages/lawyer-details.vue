<script setup lang="ts">
import {justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch, withMessageBodyIfApplicable} from "#imports";
import {isLeft} from "fp-ts/Either";
import {StatusEnum, UserAccessType} from "../../common/db-types";
import {GetLawyerInput, LawyerSearchResult} from "../../common/rest-api-schema";
import {Nuly} from "../../common/utils/types";
import BareAppointmentsDistributor from "../components/appointments-cases/BareAppointmentsDistributor.vue";
import BareCasesTable from "../components/appointments-cases/BareCasesTable.vue";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import LawyerPlaceholderCard from "../components/placeholders/LawyerPlaceholderCard.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

const {message, error} = useModals();
const router           = useRouter();
const route            = useRoute();
const userStore        = useUserStore();
const lawyer           = ref<LawyerSearchResult | Nuly>();
const isAdmin          = computed(() => userStore.authToken != null && userStore.authToken.userType === UserAccessType.Admin);
const isLoading        = ref<boolean>(false);

watch(() => route.query.id, async value => {
	const id = value?.toString();
	if (id == null || id.length === 0 || id === "0") {
		await error("Invalid id for a lawyer");
		await navigateTo("/");
		return;
	}

	const body: GetLawyerInput = isAdmin.value ? {
		id:                     id,
		getCaseSpecializations: true,
		getBareAppointments:    true,
		getBareCases:           true,
		getStatistics:          true,
		authToken:              userStore.authToken,
	} : {
		id:                     id,
		getCaseSpecializations: true,
		// getStatistics:          true,
	};
	isLoading.value            = true;
	const res                  = await justiceFirmApi.getLawyer(body);
	isLoading.value            = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error(withMessageBodyIfApplicable("Failed to find a lawyer with the id " + id, res));
		await navigateTo("/");
		return;
	}

	lawyer.value = res.right.body;
}, {immediate: true});
</script>

<template>
<div v-if="isLoading">
	<LawyerPlaceholderCard :num-extra-actions="1" side-by-side class="w-100" show-case-specializations />
</div>
<div v-if="lawyer!=null">
	<LawyerCard
		:lawyer="lawyer"
		side-by-side
		class="w-100"
		:show-user-id="isAdmin"
	>
		<template #actions>
		<v-btn
			v-if="!isAdmin && lawyer.status === StatusEnum.Confirmed"
			:to="`/open-appointment?id=${lawyer.id}`"
			color="teal-lighten-3"
			density="compact"
			elevation="2"
			rounded
			variant="elevated">Open appointment request
		</v-btn>
		</template>
	</LawyerCard>

	<div v-if="lawyer.cases != null">
		<br />
		<h2>Lawyer's Current Open Cases</h2>
		<BareCasesTable :cases="lawyer.cases" other-user-title="Client" class="bg-blue-lighten-3" />
	</div>

	<BareAppointmentsDistributor :appointments="lawyer.appointments" v-if="lawyer.appointments != null" />
</div>
</template>
