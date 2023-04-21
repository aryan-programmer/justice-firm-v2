<script setup lang="ts">
import {justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {Nuly} from "../../common/utils/types";
import {ModelResponseOrErr} from "../../singularity/model.client";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import {useModals} from "../store/modalsStore";

const {message, error} = useModals();
const router           = useRouter();
const route            = useRoute();
const lawyer           = ref<LawyerSearchResult | Nuly>();

watch(() => route.query.id, async value => {
	const id = value?.toString();
	if (id == null || id.length === 0 || id === "0") {
		await error("Invalid id for a lawyer");
		await navigateTo("/");
		return;
	}

	const resP: Promise<ModelResponseOrErr<LawyerSearchResult | Nuly>> = justiceFirmApi.getLawyer({
		id:                     id,
		getCaseSpecializations: true,
	});

	const res = await resP;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		await error("Failed to find a lawyer with the id " + id);
		await navigateTo("/");
		return;
	}

	lawyer.value = res.right.body;
	console.log(res.right.body);
}, {immediate: true});
</script>

<style>
.lawyer-details-card-parent {
	display: flex;
}

.lawyer-details-card {
	margin-right: auto;
	margin-left: auto;
}
</style>

<template>
<v-row
	v-if="lawyer!=null"
	class="lawyer-details-card-parent"
>
	<div class="v-col v-col-12 v-col-sm-9 lawyer-details-card">
		<LawyerCard
			:lawyer="lawyer"
			side-by-side
			class=""
		>
			<template #actions>
			<v-btn
				:to="`/open-appointment?id=${lawyer.id}`"
				color="teal-lighten-3"
				density="default"
				elevation="2"
				rounded
				variant="elevated">Open appointment request
			</v-btn>
			</template>
		</LawyerCard>
	</div>
</v-row>
</template>
