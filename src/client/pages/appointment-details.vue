<script setup lang="ts">
import {computed, definePageMeta, justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {LocationQuery} from "vue-router";
import {LawyerAuthToken} from "../../common/api-types";
import {StatusEnum, UserAccessType} from "../../common/db-types";
import {AppointmentFullData, SetAppointmentStatusInput} from "../../common/rest-api-schema";
import {nn} from "../../common/utils/asserts";
import {dateStringFormat, firstIfArray, isNullOrEmpty, statusSearchDBToHuman} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import CaseUpgradeDialog from "../components/appointments-cases/UpgradeAppointmentToCaseDialog.vue";
import ClientCard from "../components/details-cards/ClientCard.vue";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import AppointmentDetailsPlaceholderCard from "../components/placeholders/AppointmentDetailsPlaceholderCard.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "yes-user-page"
});

const {message, error}    = useModals();
const userStore           = useUserStore();
const route               = useRoute();
const router              = useRouter();
const appointment         = ref<AppointmentFullData | Nuly>(null);
const isLoading           = ref<boolean>(false);
const rejectDialogOpen    = ref<boolean>(false);
const confirmDialogOpen   = ref<boolean>(false);
const appointmentDateTime = ref("");

const showingAppointmentConfirmRejectButtons = computed(() =>
	userStore.authToken?.userType === UserAccessType.Lawyer &&
	appointment.value?.status === StatusEnum.Waiting
);
const showingUpgradeAppointmentButton        = computed(() =>
	userStore.authToken?.userType === UserAccessType.Lawyer &&
	appointment.value?.status === StatusEnum.Confirmed &&
	isNullOrEmpty(appointment.value?.caseId)
);
const showViewCaseButton                     = computed(() => !isNullOrEmpty(appointment.value?.caseId));
const shouldShowCardActions                  = computed(() =>
	(showingAppointmentConfirmRejectButtons.value || showingUpgradeAppointmentButton.value || showViewCaseButton.value)
);


const showSetAppointmentTimestamp = computed(() => appointment.value?.timestamp == null || appointment.value.timestamp === "")
const appointmentDateTimeValid    = computed(() => {
	// if showSetAppointmentTimestamp then appointmentDateTime.value !== ""
	return !showSetAppointmentTimestamp.value || appointmentDateTime.value !== "";
});

watch(() => route.query, value => {
	fetchAppointment(value);
}, {immediate: true});

async function fetchAppointment (value: LocationQuery) {
	const id = firstIfArray(value.id);
	if (id == null) {
		await navigateTo("/");
		await error("Specify an appointment to view details for");
		return;
	}
	isLoading.value = true;
	const res       = await justiceFirmApi.getAppointmentRequest({
		authToken: nn(userStore.authToken),
		id,
	});
	isLoading.value = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await navigateTo("/");
		await error(`Failed to find the appointment with the ID ${id}`);
		return;
	}
	appointment.value = res.right.body;
}

async function confirmAppointment () {
	if (!appointmentDateTimeValid.value) return;
	confirmDialogOpen.value                 = false;
	const params: SetAppointmentStatusInput = {
		authToken:     nn(userStore.authToken) as LawyerAuthToken,
		appointmentId: nn(appointment.value).id,
		status:        StatusEnum.Confirmed,
		timestamp:     showSetAppointmentTimestamp.value ? appointmentDateTime.value : null
	};
	await commonSendRes(params, "confirm");
}

async function rejectAppointment () {
	rejectDialogOpen.value                  = false;
	const params: SetAppointmentStatusInput = {
		authToken:     nn(userStore.authToken) as LawyerAuthToken,
		appointmentId: nn(appointment.value).id,
		status:        StatusEnum.Rejected
	};
	await commonSendRes(params, "reject");
}

async function commonSendRes (params: SetAppointmentStatusInput, mode: string) {
	const res = await justiceFirmApi.setAppointmentStatus(params);
	if (isLeft(res) || !res.right.ok || (res.right.body != null && "message" in res.right.body)) {
		console.log(res);
		await error(`Failed to ${mode} appointment`);
		return;
	}
	message /*not-await*/(`Successfully ${mode}ed appointment`);
	await fetchAppointment(route.query);
}
</script>

<template>
<AppointmentDetailsPlaceholderCard v-if="isLoading" />
<v-card v-if="appointment!=null" color="gradient--perfect-white" class="w-100 elevation-3">
	<v-card-title>
		<h3>Appointment details</h3>
	</v-card-title>
	<v-card-text>
		<v-row>
			<v-col md="6" cols="12">
				<LawyerCard
					:lawyer="appointment.lawyer"
					class="h-100"
					:side-by-side="true"
				>
					<template #actions>
					<v-btn
						:to="`/lawyer-details?id=${appointment.lawyer.id}`"
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
					:client="appointment.client"
					:side-by-side="true"
				/>
			</v-col>
		</v-row>
		<br />
		<p>
			Opened on: {{ dateStringFormat(appointment.openedOn) }}<br />
			Appointment time: {{ dateStringFormat(appointment.timestamp) ?? "Unset" }}<br />
		</p>
		<pre class="pre-wrap text-body-2">Description:
{{ appointment.description }}</pre>
		Status:
		<v-chip
			class="fw-bold"
			:color="getColorFromStatus(appointment.status)"
			variant="tonal">{{ statusSearchDBToHuman(appointment.status) }}
		</v-chip>
	</v-card-text>
	<v-card-actions>
		<div v-if="showingAppointmentConfirmRejectButtons">
			<v-dialog
				v-model="confirmDialogOpen"
				width="auto"
			>
				<template v-slot:activator="{ props }">
				<v-btn
					class="ma-1"
					variant="elevated"
					elevation="3"
					color="green-lighten-2"
					rounded="pill"
					v-bind="props"
				>
					Confirm
				</v-btn>
				</template>
				<v-card color="gradient--deep-light-blue" class="pa-3" rounded="lg">
					<v-card-title class="text-h5">
						Confirm appointment
					</v-card-title>
					<v-card-text>
					<span v-if="!showSetAppointmentTimestamp">
						Are you sure you want to confirm this appointment?
					</span>
						<div v-else>
							<p>Set appointment timestamp to confirm</p>
							<v-text-field
								hide-details
								v-model="appointmentDateTime"
								label="Appointment timestamp"
								density="comfortable"
								type="datetime-local"
								required
							/>
						</div>
					</v-card-text>
					<v-card-actions>
						<v-btn
							color="green-darken-1"
							:elevation="appointmentDateTimeValid ? 3 : 0"
							:variant="appointmentDateTimeValid ? 'elevated' : 'tonal'"
							rounded="pill"
							:disabled="!appointmentDateTimeValid"
							@click="confirmAppointment"
						>
							Confirm
						</v-btn>
						<v-btn
							color="red-darken-3"
							variant="tonal"
							rounded="pill"
							@click="confirmDialogOpen = false"
						>
							Close
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>
			<v-dialog
				v-model="rejectDialogOpen"
				width="auto"
			>
				<template v-slot:activator="{ props }">
				<v-btn
					class="ma-1"
					variant="tonal"
					color="red-darken-2"
					rounded="pill"
					v-bind="props"
				>
					Reject
				</v-btn>
				</template>
				<v-card color="gradient--amy-crisp" class="pa-3" rounded="lg">
					<v-card-title class="text-h5">
						Reject appointment
					</v-card-title>
					<v-card-text>Are you sure you want to reject this appointment?</v-card-text>
					<v-card-actions>
						<v-btn
							color="amber-darken-1"
							elevation="3"
							variant="elevated"
							rounded="pill"
							@click="rejectAppointment"
						>
							Yes, I do want to reject
						</v-btn>
						<v-btn
							color="cyan-darken-4"
							variant="tonal"
							rounded="pill"
							@click="rejectDialogOpen = false"
						>
							No, I do not want to reject.
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-dialog>
		</div>
		<div v-else-if="showingUpgradeAppointmentButton">
			<CaseUpgradeDialog
				:appointment-id="appointment.id"
				:default-description="appointment.description" />
		</div>
		<v-btn
			class="ma-1"
			v-if="showViewCaseButton"
			:to="`/case-details?id=${appointment.caseId}`"
			color="teal-lighten-3"
			density="default"
			elevation="2"
			rounded
			variant="elevated">View Case
		</v-btn>
		<v-btn
			class="ma-1"
			:to="`/chat-group?id=${appointment.groupId}`"
			color="teal-lighten-3"
			density="default"
			elevation="2"
			rounded
			variant="elevated">View Chat group
		</v-btn>
	</v-card-actions>
</v-card>
</template>
