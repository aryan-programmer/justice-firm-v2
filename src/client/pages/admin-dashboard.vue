<script setup lang="ts">
import {definePageMeta, justiceFirmApi, onMounted, ref, useHead} from "#imports";
import {isLeft} from "fp-ts/Either";
import {AdminAuthToken} from "../../common/api-types";
import {LawyerSearchResult} from "../../common/db-types";
import {nn} from "../../common/utils/asserts";
import {StatusEnum} from "../../common/utils/constants";
import {Nuly} from "../../common/utils/types";
import AdminDashboardForm from "../components/admin-dashboard/AdminDashboardForm.vue";
import FullScreenLoader from "../components/placeholders/FullScreenLoader.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "admin-only-page"
});

useHead({title: "Administrator Dashboard"});

const {message, error} = useModals();
const userStore        = useUserStore();

const isLoading      = ref<boolean>(false);
const waitingLawyers = ref<LawyerSearchResult[] | Nuly>(null);

onMounted(fetchLawyers);

async function fetchLawyers () {
	isLoading.value = true;
	const res       = await justiceFirmApi.searchAllLawyers({
		authToken: nn(userStore.authToken) as AdminAuthToken,
		address:   "",
		email:     "",
		name:      "",
		status:    StatusEnum.Waiting
	});
	isLoading.value = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		await error(`Failed to get waiting lawyers`);
		return;
	}
	if ("message" in res.right.body) {
		console.log(res);
		await error(`Failed to get waiting lawyers`);
		return;
	}
	waitingLawyers.value = res.right.body;
}
</script>

<template>
<h2>Administrator Dashboard</h2>
<FullScreenLoader v-if="isLoading" />
<AdminDashboardForm
	:lawyers="waitingLawyers"
	@apply-success="fetchLawyers"
	v-else-if="waitingLawyers!=null && waitingLawyers.length>0"
/>
<v-card v-else text="No waiting lawyers found" class="bg-gradient--gagarin-view" />
</template>
