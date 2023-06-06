import {NotificationsWSAPIClient, onBeforeUnmount, ReactiveSplayTree, ref, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {defineStore} from "pinia";
import {AuthToken} from "../../common/api-types";
import {ID_T} from "../../common/db-types";
import {compareDates, reverseComparator} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {notificationDataToDisplayable} from "../utils/functions";
import {NotificationDataDisplayable} from "../utils/types";
import {defaultSnackbarTimeout, useModals} from "./modalsStore";
import {useUserStore} from "./userStore";

export const defaultNotificationTimeout = defaultSnackbarTimeout * 1.75;

export const useNotificationsStore = defineStore('NotificationsStore', () => {
	const {message, error, showNotification} = useModals();
	const userStore                          = useUserStore();
	const notificationsClient                = ref<NotificationsWSAPIClient | Nuly>();
	const isLoading                          = ref<boolean>(true);
	const notificationsArray                 = ref<NotificationDataDisplayable[]>([]);
	const notifications                      = new ReactiveSplayTree<Date, NotificationDataDisplayable>(() => {
		const v                  = notifications.values();
		notificationsArray.value = v;
		console.log(v);
	}, reverseComparator(compareDates));
	const pastNotifications                  = new Set<ID_T>();

	watch(() => userStore.authToken, value => {
		openConnection(userStore.authToken);
	}, {immediate: true});

	watch(notificationsClient, (value, oldValue) => {
		if (oldValue != null) {
			oldValue.removeAllListeners('notification');
			oldValue.close();
		}
		const cl = notificationsClient.value;
		if (cl == null) return;
		cl.on('notification', async message => {
			console.log(message);
			if (pastNotifications.has(message.id)) return;
			const notif = notificationDataToDisplayable(message);
			pastNotifications.add(notif.id);
			notifications.add(notif.timestamp, notif);
			await showNotification(notif, {
				timeoutMs: defaultNotificationTimeout,
			});
		});
	});

	onBeforeUnmount(() => {
		notificationsClient.value?.close();
	});

	async function openConnection (authToken: AuthToken | Nuly) {
		await notificationsClient.value?.close();
		notificationsClient.value = null;
		if (authToken == null) {
			return;
		}

		isLoading.value = true;
		try {
			const cl = new NotificationsWSAPIClient();
			await cl.open();
			const res = await cl.establishConnection({authToken: authToken});
			if (isLeft(res) || !res.right.ok || (res.right.body != null && "message" in res.right.body)) {
				await cl.close();
				await error(`Failed to open a connection for notifications with the ID`);
				return;
			}
			notificationsClient.value = cl;
			const messagesRes         = await cl.getNotifications({authToken: authToken});
			if (isLeft(messagesRes) || !messagesRes.right.ok || messagesRes.right.body == null || "message" in messagesRes.right.body) {
				console.log(messagesRes);
				await error(`Failed to get messages`);
				return;
			}
			const msgs: NotificationDataDisplayable[] = messagesRes.right.body.map(notificationDataToDisplayable);
			for (const msg of msgs) {
				pastNotifications.add(msg.id);
			}
			notifications.load(msgs.map(v => v.timestamp), msgs, true);
		} finally {
			isLoading.value = false;
		}
	}

	return {notifications: notificationsArray};
});
