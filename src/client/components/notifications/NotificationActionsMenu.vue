<script setup lang="ts">
import {useNotificationsStore} from "../../store/notificationsStore";
import {BtnVariants, NotificationDataDisplayable} from "../../utils/types";
import IconButton from "../general/IconButton.vue";

const props = defineProps<{
	notification: NotificationDataDisplayable,
	isRead?: boolean,
	class?: string,
}>();

const notificationsStore = useNotificationsStore();

function setIsReadStatus (isRead: boolean) {
	notificationsStore.setIsReadStatus(props.notification.id, isRead);
}
</script>

<template>
<v-menu>
	<template v-slot:activator="{ props: menuActivatorProps }">
	<IconButton
		:class="props.class??''"
		icon="fa-bars"
		:color="isRead?'black':'white'"
		:variant="isRead?BtnVariants.Tonal:BtnVariants.Elevated"
		v-bind="menuActivatorProps"
	/>
	</template>

	<v-list>
		<v-list-item v-if="props.isRead" @click="setIsReadStatus(false)">
			<v-list-item-title>Mark as unread</v-list-item-title>
		</v-list-item>
		<v-list-item v-else @click="setIsReadStatus(true)">
			<v-list-item-title>Mark as read</v-list-item-title>
		</v-list-item>
	</v-list>
</v-menu>
</template>
