<script setup lang="ts">
import {justiceFirmApi, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LocationQuery} from "vue-router";
import {CaseFullData} from "../../common/api-schema";
import {CaseStatusEnum} from "../../common/db-types";
import {nn} from "../../common/utils/asserts";
import {dateStringFormat, firstIfArray} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import ClientCard from "../components/ClientCard.vue";
import LawyerCard from "../components/LawyerCard.vue";
import {useUserStore} from "../store/userStore";

const route     = useRoute();
const userStore = useUserStore();
const router    = useRouter();

const caseData = ref<CaseFullData | Nuly>(null);

watch(() => route.query, value => {
	fetchCase(value);
}, {immediate: true});

async function fetchCase (value: LocationQuery) {
	const id = firstIfArray(value.id);
	if (id == null) {
		await router.push("/");
		alert("Specify a case to view details for");
		return;
	}
	console.log({id});
	const res = await justiceFirmApi.getCase({
		body: {
			authToken: nn(userStore.authToken),
			id,
		}
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await router.push("/");
		alert(`Failed to find the case with the ID ${id}`);
		return;
	}
	const a = res.right.body;
	console.log(a);
	caseData.value = a;
}
</script>

<template>
<v-card v-if="caseData!=null" color="gradient--juicy-peach" class="elevation-3">
	<v-card-title>
		<h3>Case details</h3>
	</v-card-title>
	<v-card-text>
		<v-row>
			<v-col md="6" cols="12">
				<LawyerCard
					:lawyer="caseData.lawyer"
					class="h-100"
					:side-by-side="true"
				>
					<template #actions>
					<v-btn
						:to="`/lawyer-details?id=${caseData.lawyer.id}`"
						color="cyan-lighten-4"
						density="compact"
						rounded
						variant="tonal">View details
					</v-btn>
					</template>
				</LawyerCard>
			</v-col>
			<v-col md="6" cols="12">
				<ClientCard
					class="h-100"
					:client="caseData.client"
					:side-by-side="true"
				/>
			</v-col>
		</v-row>
		<br />
		<p>
			Opened on: {{ dateStringFormat(caseData.openedOn) }}<br />
			Case Type: {{ caseData.caseType.name }}
		</p>
		<pre>
Description:
{{ caseData.description }}</pre>
		<p v-if="caseData.status === CaseStatusEnum.Waiting">
			Status:
			<v-chip class="fw-bold" color="amber-darken-3" variant="tonal">Waiting</v-chip>
		</p>
		<p v-else-if="caseData.status === CaseStatusEnum.Open">
			Status:
			<v-chip class="fw-bold" color="green-darken-3" variant="tonal">Open</v-chip>
		</p>
		<p v-else-if="caseData.status === CaseStatusEnum.Closed">
			Status:
			<v-chip class="fw-bold" color="red-darken-2" variant="tonal">Closed</v-chip>
		</p>
	</v-card-text>
</v-card>
</template>
