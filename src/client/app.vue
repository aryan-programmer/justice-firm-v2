<script setup lang="ts">
import {useRouter} from "#app";
import {computed} from "#imports";
import {ref} from "vue";
import {UserAccessType} from "../common/db-types";
import NavItem from "./components/NavItem.vue";
import {useUserStore} from "./store/userStore";

const userStore = useUserStore();

const drawer = ref(true);
const rail   = ref(true);

const router = useRouter();

const userDeps = computed(args => {
	if (userStore.authToken == null) {
		return {
			links: [
				{icon: "fa-home", title: "Home", link: "/"},
				{icon: "fa-search", title: "Search Lawyers", link: "/search-lawyers"},
				{icon: "fa-user-plus", title: "Register", link: '/register'},
				{icon: "fa-sign-in", title: "Sign in", link: "/sign-in"},
			],
			color: "gradient--cochiti-lake",
			theme: "light",
			// mainIcon: null,
		};
	}
	switch (userStore.authToken.userType) {
	case UserAccessType.Lawyer:
		return {
			links: [
				{icon: "fa-gavel", title: "Home", link: "/"},
				{icon: "fa-calendar-days", title: "Appointments", link: "/lawyer-appointments"},
				// {icon: "fa-sign-out", title: "Sign out", link: "/sign-out"},
			],
			color: "gradient--flying-lemon",
			theme: "light",
			// mainIcon: {icon: "fa-gavel", title: "Home"},
		};
	case UserAccessType.Client:
		return {
			links: [
				{icon: "fa-user", title: "Home", link: "/"},
				{icon: "fa-search", title: "Search Lawyers", link: "/search-lawyers"},
				{icon: "fa-calendar-days", title: "Appointments", link: "/client-appointments"},
				// {icon: "fa-sign-out", title: "Sign out", link: "/sign-out"},
			],
			color: "gradient--perfect-white",
			theme: "light",
			// mainIcon: {icon: "fa-gavel", title: "Home"},
		};
	case UserAccessType.Admin:
		return {
			links: [
				{icon: "fa-bug-slash", title: "Home", link: "/"},
				{icon: "fa-search", title: "Search Lawyers", link: "/search-lawyers"},
				{icon: "fa-table", title: "Admin Dashboard", link: "/admin-dashboard"},
				// {icon: "fa-sign-out", title: "Sign out", link: "/sign-out"},
			],
			color: "gradient--premium-dark",
			theme: "dark",
		};
	}
});

function signOut () {
	userStore.signOut();
	router.push("/");
}

function pathCompare (link: string) {
	const currPath = router.currentRoute.value.path;
	if (link === "/") return currPath === "/";
	return currPath.startsWith(link);
}
</script>

<template>
<v-layout>
	<v-navigation-drawer
		v-model="drawer"
		:rail="rail"
		permanent
		:color="userDeps.color"
		:theme="userDeps.theme"
		rail-width="120"
	>
		<NavItem
			v-for="link in userDeps.links"
			:link="link.link"
			:icon="link.icon"
			:title="link.title"
			:value="link.link"
			:theme="userDeps.theme"
			:active="pathCompare(link.link)" />
		<NavItem
			v-if="userStore.authToken!=null"
			icon="fa-sign-out"
			title="Sign out"
			value="sign-out"
			:theme="userDeps.theme"
			@click="signOut" />
	</v-navigation-drawer>
	<v-main>
		<div class="w-100 pa-2">
			<NuxtPage />
		</div>
	</v-main>
</v-layout>
</template>
