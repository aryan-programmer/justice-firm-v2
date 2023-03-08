<script setup lang="ts">
import {computed, useSlots} from "#imports";
import {LawyerSearchResult} from "../../common/api-schema";

const props = defineProps<{
	lawyer: LawyerSearchResult,
	sideBySide?: boolean,
	class?: string
}>();

const slots = useSlots();

const sideImage = computed(() => props.sideBySide === true);
</script>

<template>
<v-card
	color="gradient--sweet-period"
	:class="props.class"
	theme="dark">
	<v-img v-if="!sideImage" :src="props.lawyer.photoPath" class="clamp-image-height" />
	<v-card-text>
		<v-row class="justify-space-between">
			<v-col cols="auto" class="pt-0 mt-0">
				<v-card-title class="ps-0 mt-0 pt-0">
					{{ props.lawyer.name }}
				</v-card-title>
				Email: {{ props.lawyer.email }}<br />
				Phone: {{ props.lawyer.phone }}<br />
				Latitude & Longitude: ({{ props.lawyer.latitude }}, {{ props.lawyer.longitude }})<br />
				<span v-if="typeof props.lawyer.distance == 'number'">Spherical distance from current location: {{ props.lawyer.distance.toPrecision(2) }} km<br /></span>
				<pre>
Office Address:
{{ props.lawyer.address }}</pre>
				<a :href="props.lawyer.certificationLink" class="text-white mt-3">View certification</a>
			</v-col>
			<img :src="props.lawyer.photoPath" v-if="sideImage" class="clamp-image-height v-col-auto" />
		</v-row>
		<v-expansion-panels v-if="lawyer.caseSpecializations != null" class="mt-3">
			<v-expansion-panel
				title="Select case specializations"
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
	<v-card-actions v-if="slots.actions != null" class="flex-column align-start mt-0 pt-0" style="min-height: 0px;">
		<slot name="actions" />
	</v-card-actions>
</v-card>
</template>
