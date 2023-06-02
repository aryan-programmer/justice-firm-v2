<script setup lang="ts">
import {contentLoaderTextRounding, useRoute, useRouter} from "#imports";
import {useDisplay} from "vuetify";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import ChatMessagesListLoader from "./ChatMessagesListLoader.vue";
import RectangularPlaceholder from "./RectangularPlaceholder.vue";

const props = defineProps<{
	class?: string
}>();

const {message, error} = useModals();
const userStore        = useUserStore();
const route            = useRoute();
const router           = useRouter();
const {width, lg}      = useDisplay();

const primaryColor   = "#e6f4ff";
const secondaryColor = "#ffcccc";
</script>

<template>
<v-card color="white" :class="props.class??'w-100 elevation-3'">
	<v-card-title>
		<v-card-title class="ps-0 mt-0 pt-0" style="max-width: 300px;">
			<RectangularPlaceholder
				:width="250"
				:height="25"
				:rounding-x="contentLoaderTextRounding"
				:rounding-y="contentLoaderTextRounding"
				:primary-color="primaryColor"
				:secondary-color="secondaryColor" />
		</v-card-title>
	</v-card-title>
	<v-card-text>
		<div class="d-flex align-center justify-center w-100 h-100 ">
			<div>
				<ChatMessagesListLoader
					:primary-color="primaryColor"
					:secondary-color="secondaryColor" />
			</div>
		</div>
	</v-card-text>
	<v-card-actions>
		<RectangularPlaceholder
			:width="width"
			auto-scale
			:height="40"
			:rounding-y="10"
			:rounding-x="10"
			:primary-color="primaryColor"
			:secondary-color="secondaryColor" />
	</v-card-actions>
</v-card>
</template>
