<script lang="ts" setup>
import {justiceFirmApi, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LawyerSearchResult} from "../../common/api-schema";
import {Nuly} from "../../common/utils/types";
import {ModelResponseOrErr} from "../../singularity/model.client";
import LawyerCard from "../components/LawyerCard.vue";

const router = useRouter();
const route  = useRoute();
const lawyer = ref<LawyerSearchResult | Nuly>();

watch(() => route.query.id, async value => {
	const id = value?.toString();
	if (id == null || id.length === 0 || id === "0") {
		alert("Invalid id for a lawyer");
		await router.push("/");
		return;
	}

	const resP: Promise<ModelResponseOrErr<LawyerSearchResult | Nuly>> = justiceFirmApi.getLawyer({
		body: {
			id:                     id,
			getCaseSpecializations: true,
		}
	});

	const res = await resP;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert("Failed to find a lawyer with the id " + id);
		await router.push("/");
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
	min-width: 50%;
}
</style>

<template>
<div
	v-if="lawyer!=null"
	class="lawyer-details-card-parent"
>
	<LawyerCard
		:lawyer="lawyer"
		side-by-side
		class="lawyer-details-card"
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
</template>
