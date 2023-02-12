import {defineNuxtRouteMiddleware, navigateTo} from "#imports";
import {UserAccessType} from "../../common/db-types";
import {useUserStore} from "../store/userStore";

export default defineNuxtRouteMiddleware((to, from) => {
	const userStore = useUserStore();
	if (userStore.authToken?.userType !== UserAccessType.Client) {
		const err = `You must be logged in as a client to access the page ${to.fullPath}`;
		alert(err);
		return navigateTo(from == null || from.fullPath === to.fullPath ? "/" : from.fullPath);
	}
	return;
});
