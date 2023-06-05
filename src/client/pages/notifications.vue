<script setup lang="ts">
import {definePageMeta} from "#imports";
import {useDisplay} from "vuetify";
import NotificationsList from "../components/notifications/NotificationsList.vue";
import {useNotificationsStore} from "../store/notificationsStore";

definePageMeta({
	middleware: "yes-user-page"
});
const notifications           = useNotificationsStore();
const display                 = useDisplay();
const {mdAndUp}               = display;
const showTimeStampOnOpposite = mdAndUp;
</script>

<template>
<v-card density="compact">
	<!--	<v-card-title>-->
	<!--		<h3></h3>-->
	<!--	</v-card-title>-->
	<v-card-text>
		<NotificationsList
			header="Notifications"
			:notifications="notifications.notifications"
			:show-time-stamp-on-opposite="showTimeStampOnOpposite" />
	</v-card-text>
</v-card>
</template>
