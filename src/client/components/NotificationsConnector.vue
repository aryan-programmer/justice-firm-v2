<script setup lang="ts">
import {onBeforeUnmount, reactive, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {AuthToken} from "../../common/api-types";
import {ID_T} from "../../common/db-types";
import {NotificationMessageData} from "../../common/notification-types";
import {removeProxies} from "../../common/utils/pretty-print";
import {Nuly} from "../../common/utils/types";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {NotificationsWSAPIClient} from "../utils/api-fetcher-impl";

const {message, error}  = useModals();
const userStore         = useUserStore();
const route             = useRoute();
const router            = useRouter();
const chatClient        = ref<NotificationsWSAPIClient | Nuly>();
const isLoading         = ref<boolean>(true);
const notifications     = reactive({notifications: [] as NotificationMessageData[]});
const pastNotifications = new Set<ID_T>();

watch(() => userStore.authToken, value => {
	openConnection(userStore.authToken);
}, {immediate: true});

watch(chatClient, (value, oldValue) => {
	if (oldValue != null) {
		oldValue.close();
		oldValue.removeAllListeners('notification');
	}
	const cl = chatClient.value;
	if (cl == null) return;
	cl.on('notification', async message => {
		console.log(message);
		if (pastNotifications.has(message.id)) return;
		notifications.notifications.push(message);
	});
});

onBeforeUnmount(() => {
	chatClient.value?.close();
});

async function openConnection (value: AuthToken | Nuly) {
	await chatClient.value?.close();
	chatClient.value = null;
	if (value == null) {
		return;
	}

	isLoading.value = true;
	try {
		const cl = new NotificationsWSAPIClient();
		await cl.open();
		const res = await cl.establishConnection({authToken: value});
		if (isLeft(res) || !res.right.ok || (res.right.body != null && "message" in res.right.body)) {
			await cl.close();
			await error(`Failed to open a connection for notifications with the ID`);
			return;
		}
		chatClient.value  = cl;
		const messagesRes = await cl.getNotifications({authToken: value});
		if (isLeft(messagesRes) || !messagesRes.right.ok || messagesRes.right.body == null || "message" in messagesRes.right.body) {
			console.log(messagesRes);
			await error(`Failed to get messages`);
			return;
		}
		const msgs: NotificationMessageData[] = messagesRes.right.body;
		msgs.sort((a, b) => {
			return a.timestamp.localeCompare(b.timestamp);
		});
		for (const msg of msgs) {
			pastNotifications.add(msg.id);
		}
		notifications.notifications = msgs;
	} finally {
		isLoading.value = false;
	}
	console.log(removeProxies(notifications));
}
</script>

<template>

</template>
