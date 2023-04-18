import {defineNuxtRouteMiddleware, navigateTo} from "#imports";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

export default defineNuxtRouteMiddleware((to, from) => {
	const {error}   = useModals();
	const userStore = useUserStore();
	if (userStore.authToken != null) {
		const err = `You must sign out before accessing the page ${to.fullPath}`;
		error(err);
		return navigateTo(from == null || from.fullPath === to.fullPath ? "/" : from.fullPath);
	}
	return;
});
