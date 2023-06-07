<script setup lang="ts">
import {definePageMeta, useHead} from "#imports";
import {useDisplay} from "vuetify";
import NotificationsList from "../components/notifications/NotificationsList.vue";
import {useNotificationsStore} from "../store/notificationsStore";

definePageMeta({
	middleware: "yes-user-page"
});

useHead({title: "Notifications"});

const notifications = useNotificationsStore();
const display       = useDisplay();
const {smAndDown}   = display;
const compactUi     = smAndDown;
</script>

<template>
<v-card density="compact">
	<v-card-text>
		<NotificationsList :compact-ui="compactUi">
			<v-timeline-item size="medium" fill-dot dot-color="black">
				<template v-slot:opposite v-if="!compactUi">
				<h3>Timestamp</h3>
				</template>
				<v-toolbar rounded elevation="3" style="border-bottom-right-radius: 32px !important;">
					<v-toolbar-title><h3 class="me-8">Notifications</h3></v-toolbar-title>
					<v-menu>
						<template v-slot:activator="{ props: menuActivatorProps }">
						<v-btn class="ms-16" icon v-bind="menuActivatorProps">
							<v-icon>fa-bars</v-icon>
						</v-btn>
						</template>

						<v-list>
							<v-list-item @click="notifications.markAllAsRead()">
								<v-list-item-title>Mark all as read</v-list-item-title>
							</v-list-item>
						</v-list>
					</v-menu>
				</v-toolbar>
			</v-timeline-item>
		</NotificationsList>
	</v-card-text>
</v-card>
</template>
