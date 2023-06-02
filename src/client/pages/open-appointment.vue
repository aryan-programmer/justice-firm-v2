<script setup lang="ts">
import {computed, definePageMeta, justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {ClientAuthToken} from "../../common/api-types";
import {StatusEnum, UserAccessType} from "../../common/db-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {assert} from "../../common/utils/asserts";
import {isNullOrEmpty} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "client-only-page"
});

const {message, error} = useModals();
const userStore        = useUserStore();
const router           = useRouter();
const route            = useRoute();
const lawyer           = ref<LawyerSearchResult | Nuly>();

const today       = new Date();
const todayUnixTs = Date.now();
const minDateTime = today.toISOString().substring(0, "YYYY-MM-DDThh:mm".length);

const description            = ref("");
const appointmentDateTime    = ref("");
const fixAppointmentDateTime = ref(false);
const dataValid              = computed(() => {
	return (fixAppointmentDateTime.value !== true || (
		       appointmentDateTime.value.length !== 0 &&
		       new Date(appointmentDateTime.value).getTime() >= todayUnixTs
	       )) &&
	       !isNullOrEmpty(description.value);
});

watch(() => route.query.id, async value => {
	const id = value?.toString();
	if (id == null || id.length === 0 || id === "0") {
		await error("Invalid id for a lawyer");
		await navigateTo("/");
		return;
	}

	const res = await justiceFirmApi.getLawyer({id});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error("Failed to find a lawyer with the id " + id);
		await navigateTo("/");
		return;
	}

	if (res.right.body.status !== StatusEnum.Confirmed) {
		await error(`The lawyer ${res.right.body.name}'s application has not been confirmed yet, and so no appointment requests can be made to them.`);
		await navigateTo("/");
		return;
	}

	lawyer.value = res.right.body;
}, {immediate: true});

async function handleSubmit () {
	const authToken = userStore.authToken;
	if (authToken == null || authToken.userType !== UserAccessType.Client) {
		// Should never reach here
		await error("Must be signed in as a client");
		return;
	}
	if (!dataValid.value) {
		await error("Invalid data");
		return;
	}
	const lawyerVal = lawyer.value;
	assert(lawyerVal != null);

	const timestamp = fixAppointmentDateTime.value === true && appointmentDateTime.value.length !== 0 ?
	                  new Date(appointmentDateTime.value).toISOString() :
	                  undefined;

	const res = await justiceFirmApi.openAppointmentRequest({
		authToken:   authToken as ClientAuthToken,
		lawyerId:    lawyerVal.id,
		description: description.value,
		timestamp
	});
	if (isLeft(res) || !res.right.ok || typeof res.right.body != "string") {
		console.log(res);
		await error("Failed to open appointment request");
		return;
	}
	message /*not-awaiting*/("Opened appointment request successfully.");
	await navigateTo(`/appointment-details?id=${res.right.body}`);
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
						:min="minDateTime"
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
					color="brown-lighten-2"
					:disabled="!dataValid">Open appointment request
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</form>
</template>
