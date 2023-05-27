<script setup lang="ts">
import {computed, useSlots} from "#imports";
import {useDisplay} from "vuetify";
import {StatusEnum} from "../../../common/db-types";
import {LawyerSearchResult} from "../../../common/rest-api-schema";
import {
	genderDBToHuman,
	isNullOrEmpty,
	nullOrEmptyCoalesce,
	statusSearchDBToHuman
} from "../../../common/utils/functions";

const props = defineProps<{
	lawyer: LawyerSearchResult,
	sideBySide?: boolean,
	class?: string,
	showUserId?: boolean
}>();

const slots                             = useSlots();
const display                           = useDisplay();
const {smAndDown: ignoreSideBySideTrue} = display;

const sideImage = computed(() =>
	props.sideBySide === true && !ignoreSideBySideTrue.value
);
</script>

<template>
<v-card
	color="gradient--sweet-period"
	:class="props.class"
	elevation="3"
	theme="light">
	<v-img v-if="!sideImage" :src="props.lawyer.photoPath" class="clamp-image-height" />
	<v-card-text>
		<v-row no-gutters class="justify-space-between text-white">
			<v-col cols="12" :md="sideImage?8:12" class="pt-0 mt-0">
				<v-card-title class="ps-0 mt-0 pt-0">
					{{ props.lawyer.name }}
				</v-card-title>
				<v-row no-gutters>
					<v-col class="px-0 pt-1">
						<span v-if="props.showUserId === true">User ID: {{ props.lawyer.id }}<br /></span>
						Email: {{ props.lawyer.email }}<br />
						Phone: {{ props.lawyer.phone }}<br />
						<span v-if="!isNullOrEmpty(props.lawyer.gender)">Gender: {{ genderDBToHuman(props.lawyer.gender) }}<br /></span>
						Latitude & Longitude: ({{ props.lawyer.latitude }}, {{ props.lawyer.longitude }})<br />
						<span v-if="typeof props.lawyer.distance == 'number'">
					Spherical distance from current location: {{
								props.lawyer.distance < 1 ? 'Less than 1' : props.lawyer.distance.toFixed(2)
					}} km<br />
				</span>
						<pre class="pre-wrap text-body-2">Office Address:
{{ props.lawyer.address }}</pre>
						Status:
						<v-chip
							class="fw-bold"
							:color="getColorFromStatus(props.lawyer.status)"
							density="compact"
							variant="flat">{{ statusSearchDBToHuman(props.lawyer.status) }}
						</v-chip>
						<br />
						<v-sheet
							v-if="props.lawyer.status === StatusEnum.Rejected"
							:color="rejectedColor"
							style="width: fit-content;"
							class="mt-2 rounded-lg pa-2">
							Rejection reason: {{
								nullOrEmptyCoalesce(props.lawyer.rejectionReason,
									"No reason specified")
							}}
						</v-sheet>
					</v-col>
					<v-col v-if="props.lawyer.statistics != null" cols="12" sm="5" class="px-0 pt-1">
						Total Cases: {{ props.lawyer.statistics.totalCases }}
						<br />Total Clients: {{ props.lawyer.statistics.totalClients }}
						<br />Total Appointments: {{ props.lawyer.statistics.totalAppointments }}
						<br />Waiting Appointments: {{ props.lawyer.statistics.waitingAppointments }}
						<br />Rejected Appointments: {{ props.lawyer.statistics.rejectedAppointments }}
						<br />Confirmed Appointments: {{ props.lawyer.statistics.confirmedAppointments }}
					</v-col>
				</v-row>
			</v-col>
			<v-col v-if="sideImage" class="pa-3">
				<v-img :src="props.lawyer.photoPath" class="clamp-image-height"></v-img>
			</v-col>
		</v-row>
		<v-expansion-panels v-if="lawyer.caseSpecializations != null" class="mt-3">
			<v-expansion-panel
				title="View case specializations"
				expand-icon="fas fa-chevron-down"
				collapse-icon="fas fa-chevron-up"
				ripple
				eager
			>
				<v-expansion-panel-text>
					<v-row v-if="lawyer.caseSpecializations.length > 0" dense>
						<v-col
							xl="3"
							lg="4"
							md="6"
							sm="12"
							class="d-flex align-center"
							v-for="(caseType, i) in lawyer.caseSpecializations">
							<v-icon icon="fa-circle" size="5" class="me-1" />
							{{ caseType.name }}
						</v-col>
					</v-row>
					<h3 v-else>No case specializations found</h3>
				</v-expansion-panel-text>
			</v-expansion-panel>
		</v-expansion-panels>
	</v-card-text>
	<v-card-actions
		v-if="slots.actions != null"
		class="flex-row flex-wrap align-center mt-0 pt-0"
		style="min-height: 0px;">
		<v-btn
			:href="props.lawyer.certificationLink"
			color="teal-lighten-4"
			density="compact"
			rounded
			variant="tonal">View certification
		</v-btn>
		<slot name="actions" />
	</v-card-actions>
</v-card>
</template>
