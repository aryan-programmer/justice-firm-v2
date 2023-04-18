import {defineNuxtRouteMiddleware, navigateTo} from "#imports";
import {UserAccessType} from "../../common/db-types";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

export default defineNuxtRouteMiddleware((to, from) => {
	const {error}   = useModals();
	const userStore = useUserStore();
	if (userStore.authToken?.userType !== UserAccessType.Admin) {
		const err = `You must be logged in as an administrator to access the page ${to.fullPath}`;
		error(err);
		return navigateTo(from == null || from.fullPath === to.fullPath ? "/" : from.fullPath);
	}
	return;
});
