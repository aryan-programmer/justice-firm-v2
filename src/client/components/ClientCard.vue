<script setup lang="ts">
import {computed} from "#imports";
import {useDisplay} from "vuetify";
import {ClientDataResult} from "../../common/rest-api-schema";
import {genderDBToHuman, isNullOrEmpty} from "../../common/utils/functions";

const props = defineProps<{
	client: ClientDataResult,
	sideBySide?: boolean,
	class?: string,
}>();

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
			<v-col>
				<v-card-title class="ps-0 pt-0">
					{{ props.client.name }}
				</v-card-title>
				Email: {{ props.client.email }}<br />
				Phone: {{ props.client.phone }}<br />
				<span v-if="!isNullOrEmpty(props.client.gender)">Gender: {{ genderDBToHuman(props.client.gender) }}<br /></span>
				<pre>
Address:
{{ props.client.address }}</pre>
			</v-col>
			<v-col v-if="sideImage" cols="5" class="pa-3">
				<v-img :src="props.client.photoPath" class="clamp-image-height"></v-img>
			</v-col>
		</v-row>
	</v-card-text>
</v-card>
</template>
