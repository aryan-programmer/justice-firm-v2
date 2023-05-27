<script setup lang="ts">
import {computed, useSlots} from "#imports";
import {useDisplay} from "vuetify";
import {ClientDataResult} from "../../../common/rest-api-schema";
import {genderDBToHuman, isNullOrEmpty} from "../../../common/utils/functions";

const props = defineProps<{
	client: ClientDataResult,
	sideBySide?: boolean,
	class?: string,
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
	color="gradient--amy-crisp"
	:class="props.class"
	theme="dark">
	<v-img v-if="!sideImage" :src="props.client.photoPath" class="clamp-image-height" />
	<v-card-text>
		<v-row no-gutters>
			<v-col cols="12" :md="sideImage?8:12">
				<v-card-title class="ps-0 pt-0">
					{{ props.client.name }}
				</v-card-title>
				Email: {{ props.client.email }}<br />
				Phone: {{ props.client.phone }}<br />
				<span v-if="!isNullOrEmpty(props.client.gender)">Gender: {{ genderDBToHuman(props.client.gender) }}<br /></span>
				<pre class="pre-wrap text-body-2">Address:
{{ props.client.address }}</pre>
			</v-col>
			<v-col v-if="sideImage" class="pa-3">
				<v-img :src="props.client.photoPath" class="clamp-image-height"></v-img>
			</v-col>
		</v-row>
	</v-card-text>
	<v-card-actions
		v-if="slots.actions != null"
		class="flex-row flex-wrap align-center mt-0 pt-0"
		style="min-height: 0px;">
		<slot name="actions" />
	</v-card-actions>
</v-card>
</template>
