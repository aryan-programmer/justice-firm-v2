<script setup lang="ts">
import {computed} from "#imports";
import {LawyerSearchResult} from "../../common/api-schema";

const props = defineProps<{
	lawyer: LawyerSearchResult,
	sideBySide?: boolean,
	hideOpenAppointmentRequestButton?: boolean,
	class?: string
}>();

const sideImage = computed(() => props.sideBySide === true);
</script>

<template>
<v-card
	color="gradient--sweet-period"
	:class="props.class"
	theme="dark">
	<v-img v-if="!sideImage" :src="props.lawyer.photoPath" class="clamp-image-height" />
	<v-card-text>
		<v-row>
			<v-col>
				<v-card-title class="ps-0">
					{{ props.lawyer.name }}
				</v-card-title>
				Email: {{ props.lawyer.email }}<br />
				Phone: {{ props.lawyer.phone }}<br />
				Latitude & Longitude: ({{ props.lawyer.latitude }}, {{ props.lawyer.longitude }})<br />
				<span v-if="typeof props.lawyer.distance == 'number'">Spherical distance from current location: {{ props.lawyer.distance.toPrecision(2) }} km<br /></span>
				<pre>
Office Address:
{{ props.lawyer.address }}</pre>
				<br />
				<a :href="props.lawyer.certificationLink" class="text-white">View certification</a>
			</v-col>
			<v-col v-if="sideImage" cols="5" class="pa-3">
				<v-img :src="props.lawyer.photoPath" class="clamp-image-height"></v-img>
			</v-col>
		</v-row>
	</v-card-text>
	<v-card-actions v-if="props.hideOpenAppointmentRequestButton!==true">
		<v-btn
			:to="`/open-appointment?id=${props.lawyer.id}`"
			color="teal-lighten-4"
			density="compact"
			rounded
			variant="tonal">Open appointment request
		</v-btn>
	</v-card-actions>
</v-card>
</template>
