<script setup lang="ts">
import {LawyerSearchResult} from "../../common/api-schema";
import {useUserStore} from "../store/userStore";

const props     = defineProps<{ lawyer: LawyerSearchResult }>();
const userStore = useUserStore();
</script>

<template>
<v-card
	color="gradient--sweet-period"
	theme="dark"
	:title="props.lawyer.name">
	<v-img :src="props.lawyer.photoPath" />
	<v-card-text>
		Email: {{ props.lawyer.email }}<br />
		Phone: {{ props.lawyer.phone }}<br />
		Latitude & Longitude: ({{ props.lawyer.latitude }}, {{ props.lawyer.longitude }})<br />
		<span v-if="typeof props.lawyer.distance == 'number'">Spherical distance from current location: {{ props.lawyer.distance.toPrecision(2) }} km<br /></span>
		<pre>
Office Address:
{{ props.lawyer.address }}</pre>
		<br />
		<a :href="props.lawyer.certificationLink">View certification</a>
	</v-card-text>
	<v-card-actions>
		<v-btn
			:to="`/open-appointment?id=${lawyer.id}`"
			color="teal-lighten-4"
			density="compact"
			rounded
			variant="tonal">Open appointment request
		</v-btn>
	</v-card-actions>
</v-card>
</template>
