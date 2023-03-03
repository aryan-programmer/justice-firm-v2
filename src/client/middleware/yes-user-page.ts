import {defineNuxtRouteMiddleware, navigateTo} from "#imports";
import {useUserStore} from "../store/userStore";

export default defineNuxtRouteMiddleware((to, from) => {
	const userStore = useUserStore();
	if (userStore.authToken == null) {
		const err = `You must sign in before accessing the page ${to.fullPath}`;
		alert(err);
		return navigateTo(from == null || from.fullPath === to.fullPath ? "/" : from.fullPath);
	}
	return;
});
