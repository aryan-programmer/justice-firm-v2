import {defineNuxtRouteMiddleware, navigateTo} from "#imports";
import {UserAccessType} from "../../common/db-types";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

export default defineNuxtRouteMiddleware((to, from) => {
	const {error}   = useModals();
	const userStore = useUserStore();
	if (userStore.authToken?.userType === UserAccessType.Lawyer) {
		const err = `You can not access the page ${to.fullPath} if you are a lawyer`;
		error(err);
		return navigateTo(from == null || from.fullPath === to.fullPath ? "/" : from.fullPath);
	}
	return;
});
