<script setup lang="ts">
import {definePageMeta, justiceFirmApi, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {ClientAuthToken} from "../../common/api-types";
import {UserAccessType} from "../../common/db-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {assert} from "../../common/utils/asserts";
import {Nuly} from "../../common/utils/types";
import {ModelResponseOrErr} from "../../singularity/model.client";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "client-only-page"
});

const userStore = useUserStore();
const router    = useRouter();
const route     = useRoute();
const lawyer    = ref<LawyerSearchResult | Nuly>();

const description            = ref("");
const appointmentDateTime    = ref("");
const fixAppointmentDateTime = ref(false);

watch(() => route.query.id, async value => {
	const id = value?.toString();
	if (id == null || id.length === 0 || id === "0") {
		alert("Invalid id for a lawyer");
		await router.push("/");
		return;
	}

	const resP: Promise<ModelResponseOrErr<LawyerSearchResult | Nuly>> = justiceFirmApi.getLawyer({id});

	const res = await resP;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert("Failed to find a lawyer with the id " + id);
		await router.push("/");
		return;
	}

	lawyer.value = res.right.body;
}, {immediate: true});

async function handleSubmit () {
	const authToken = userStore.authToken;
	if (authToken == null || authToken.userType !== UserAccessType.Client) {
		// Should never reach here
		alert("Must be signed in as a client");
		return;
	}
	const lawyerVal = lawyer.value;
	assert(lawyerVal != null);

	const timestamp = fixAppointmentDateTime.value === true && appointmentDateTime.value.length !== 0 ?
	                  appointmentDateTime.value :
	                  undefined;

	const res = await justiceFirmApi.openAppointmentRequest({
		authToken:   authToken as ClientAuthToken,
		lawyerId:    lawyerVal.id,
		description: description.value,
		timestamp
	});
	if (isLeft(res) || !res.right.ok) {
		console.log(res);
		alert("Failed to open appointment request");
		return;
	}
	alert("Opened appointment request successfully.");
	await router.push("/search-lawyers");
}
</script>

<template>
<form v-if="lawyer!=null" @submit.prevent="handleSubmit">
	<v-card color="gradient--raccoon-back">
		<v-card-title>
			Open an appointment request for a lawyer
		</v-card-title>
		<v-card-text>
			<v-text-field
				class="mb-1"
				hide-details
				:model-value="lawyer.name"
				label="Lawyer name"
				density="compact"
				readonly
			/>
			<v-textarea
				class="mb-1"
				hide-details
				v-model="description"
				label="Case description"
				density="compact"
				rows="3"
			/>
			<v-row no-gutters>
				<div class="d-flex justify-center align-center px-2">
					<v-checkbox
						:disabled="false"
						v-model="fixAppointmentDateTime"
						hide-details
						density="compact">
						<v-tooltip
							activator="parent"
							text="Check to fix appointment time and date"
							location="top" />
					</v-checkbox>
				</div>
				<v-col>
					<v-text-field
						class="mb-1"
						hide-details
						v-model="appointmentDateTime"
						:disabled="!fixAppointmentDateTime"
						label="Fix appointment timestamp"
						density="comfortable"
						type="datetime-local"
					/>
				</v-col>
			</v-row>
			<v-divider class="my-3" />
			<div>
				<v-btn
					rounded
					type="submit"
					variant="elevated"
					value="y"
					color="brown-lighten-2">Open appointment request
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</form>
</template>
