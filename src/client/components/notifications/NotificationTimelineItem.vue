<script setup lang="ts">
import {computed} from "#imports";
import {getColorFromLevel} from "../../utils/functions";
import {NotificationDataDisplayable} from "../../utils/types";
import NotificationCard from "./NotificationCard.vue";

const props = defineProps<{
	notification: NotificationDataDisplayable,
	isRead?: boolean,
	compactUi?: boolean,
}>();

const color = computed(() => getColorFromLevel(props.notification.level));
</script>

<style>
.timeline-icon-badge {
	width: 100%;
	height: 100%;
}

.timeline-icon-badge > .v-badge__wrapper {
	display: flex;
	flex-direction: row;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
}
</style>

<template>
<v-timeline-item
	:dot-color="color"
	size="large"
	:key="notification.id"
>
	<template v-slot:opposite v-if="!compactUi">
	<p class="text-right">
		<span class="text-no-wrap">{{ notification.dateStrings.date }}</span><br />
		<span class="text-no-wrap">{{ notification.dateStrings.time }}</span>
	</p>
	</template>
	<template v-slot:icon>
	<v-icon color="white" v-if="isRead">{{ notification.icon }}</v-icon>
	<v-badge content="NEW" class="timeline-icon-badge" v-else color="purple">
		<v-icon color="white">{{ notification.icon }}</v-icon>
	</v-badge>
	</template>
	<NotificationCard :notification="notification" :compact-ui="compactUi" :is-read="isRead" />
</v-timeline-item>
</template>
