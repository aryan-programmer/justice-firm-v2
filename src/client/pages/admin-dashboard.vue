<script setup lang="ts">
import {definePageMeta, justiceFirmApi, onMounted, ref} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LawyerSearchResult} from "../../common/api-schema";
import {AdminAuthToken} from "../../common/api-types";
import {nn} from "../../common/utils/asserts";
import {Nuly} from "../../common/utils/types";
import AdminDashboardForm from "../components/AdminDashboardForm.vue";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "admin-only-page"
});

const userStore      = useUserStore();
const waitingLawyers = ref<LawyerSearchResult[] | Nuly>(null);

onMounted(fetchLawyers);

async function fetchLawyers () {
	const res = await justiceFirmApi.getWaitingLawyers({
		body: {
			authToken: nn(userStore.authToken) as AdminAuthToken
		}
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert(`Failed to get waiting lawyers`);
		return;
	}
	if ("message" in res.right.body) {
		console.log(res);
		alert(`Failed to get waiting lawyers`);
		return;
	}
	waitingLawyers.value = res.right.body;
}
</script>

<template>
<h2>Administrator Dashboard</h2>
<AdminDashboardForm
	:waiting-lawyers="waitingLawyers"
	@apply-success="fetchLawyers"
	v-if="waitingLawyers!==null && waitingLawyers.length>0"
/>
<v-card v-else text="No waiting lawyers found" class="bg-gradient--gagarin-view" />
</template>
