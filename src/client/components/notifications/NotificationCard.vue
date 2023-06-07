<script setup lang="ts">
import {computed, getColorFromLevel} from "#imports";
import {NotificationDataDisplayable} from "../../utils/types";
import FileDownloadButton from "../uploaded-files/FileDownloadButton.vue";
import NotificationActionsMenu from "./NotificationActionsMenu.vue";

const props = defineProps<{
	notification: NotificationDataDisplayable,
	isRead?: boolean,
	compactUi?: boolean,
}>();

const color    = computed(() => getColorFromLevel(props.notification.level));
const hasLinks = computed(() => props.notification.links.length > 0);
</script>

<style>
.notification-card .v-card-subtitle {
	opacity: 1;
}
</style>

<template>
<v-card
	:color="color"
	class="notification-card"
	density="compact"
	:variant="isRead?'tonal':'elevated'"
	:elevation="isRead?0:3"
	rounded="lg">
	<template v-slot:subtitle v-if="compactUi">
	{{ notification.dateStrings.dateTime }}
	</template>
	<template v-slot:append v-if="compactUi">
	<NotificationActionsMenu class="ms-2" :notification="notification" :is-read="isRead" />
	</template>
	<v-card-text class="" v-bind:class="{'pb-0': hasLinks}">
		<div class="d-flex flex-row flex-nowrap">
			<p class="pre-wrap align-self-center">{{ notification.text }}</p>
			<NotificationActionsMenu
				class="align-self-start ms-3"
				v-if="!compactUi"
				:notification="notification"
				:is-read="isRead" />
		</div>
	</v-card-text>
	<v-card-actions class="pt-1" style="min-height: 0px;" v-if="hasLinks">
		<template v-for="link in notification.links">
		<v-btn
			v-if="'link' in link"
			:to="link.link"
			color="cyan-lighten-4"
			density="compact"
			rounded
			variant="elevated">
			{{ link.text }}
		</v-btn>
		<FileDownloadButton
			v-else-if="'file' in link"
			:file="link.file"
			:button-text="link.text"
			color="cyan-lighten-4" />
		</template>
	</v-card-actions>
</v-card>
</template>
