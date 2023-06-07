<script setup lang="ts">
import {computed} from "#imports";
import {useNotificationsStore} from "../../store/notificationsStore";
import NotificationTimelineItem from "./NotificationTimelineItem.vue";

const props              = defineProps<{
	compactUi?: boolean,
}>();
const notificationsStore = useNotificationsStore();

const compactUi = computed(() => props.compactUi === true);
// TODO: Use https://www.npmjs.com/package/vue-virtual-scroller
</script>

<template>
<v-timeline :density="compactUi?'compact':'comfortable'">
	<slot />
	<NotificationTimelineItem
		v-for="notif in notificationsStore.notifications"
		:notification="notif"
		:compact-ui="compactUi"
		:is-read="!notificationsStore.unreadNotifications.has(notif.id)"
	/>
</v-timeline>
</template>
