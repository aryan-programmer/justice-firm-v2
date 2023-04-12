<script setup lang="ts">
import {useRouter} from "#app";
import {computed, navigateTo} from "#imports";
import {ref} from "vue";
import {useDisplay} from "vuetify";
import {UserAccessType} from "../common/db-types";
import {capitalizeFirstLetter} from "../common/utils/functions";
import NavItem from "./components/NavItem.vue";
import {useUserStore} from "./store/userStore";

const userStore = useUserStore();

const isSideNavVisible            = ref(false);
const display                     = useDisplay();
const {xs: hideSideNavBreakpoint} = display;
const rail                        = computed(() => !hideSideNavBreakpoint.value);

const router = useRouter();

const userInfo    = computed(() => {
	// console.log(display, {isSideNavVisible:isSideNavVisible.value, hideSideNavBreakpoint: hideSideNavBreakpoint.value}, display.name.value);
	if (userStore.authToken == null) {
		return "Anonymous user";
	}
	return capitalizeFirstLetter(userStore.authToken.userType) + " " + userStore.authToken.name
})
const commonLinks = [
	{icon: "fa-search", title: "Find Lawyer", link: "/search-lawyers"},
];
const userDeps    = computed(() => {
	if (userStore.authToken == null) {
		return {
			links: [
				{icon: "fa-home", title: "Home", link: "/"},
				...commonLinks,
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
				{icon: "fa-briefcase", title: "Cases", link: "/lawyer-cases"},
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
				...commonLinks,
				{icon: "fa-calendar-days", title: "Appointments", link: "/client-appointments"},
				{icon: "fa-briefcase", title: "Cases", link: "/client-cases"},
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
				{icon: "fa-search", title: "Search Lawyers", link: "/admin-search-lawyers"},
				{icon: "fa-table", title: "Admin Dashboard", link: "/admin-dashboard"},
				// {icon: "fa-sign-out", title: "Sign out", link: "/sign-out"},
			],
			color: "gradient--premium-dark",
			theme: "dark",
		};
	}
});

async function signOut () {
	userStore.signOut();
	await navigateTo("/");
}

function pathCompare (link: string) {
	const currPath = router.currentRoute.value.path;
	if (link === "/") return currPath === "/";
	return currPath.startsWith(link);
}
</script>

<style>
.app-bar-title-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	width: 100%;
}
</style>

<template>
<v-layout class="mh-100vh">
	<v-app-bar
		:color="userDeps.color"
		:theme="userDeps.theme"
		density="compact"
		elevation="3"
	>
		<template v-slot:prepend>
		<v-app-bar-nav-icon
			v-if="hideSideNavBreakpoint"
			@click="isSideNavVisible = !isSideNavVisible"
		></v-app-bar-nav-icon>
		</template>

		<v-app-bar-title>
			<h3 class="app-bar-title-text">Justice firm</h3>
		</v-app-bar-title>

		<template v-slot:append>
		Welcome, {{ userInfo }}
		</template>
	</v-app-bar>
	<v-navigation-drawer
		:modelValue="isSideNavVisible || !hideSideNavBreakpoint"
		@update:modelValue="v=>isSideNavVisible=v"
		:rail="rail"
		:permanent="!hideSideNavBreakpoint"
		:temporary="hideSideNavBreakpoint"
		:color="userDeps.color"
		:theme="userDeps.theme"
		rail-width="120"
		elevation="3"
	>
		<div class="pt-2"></div>
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
		<div class="pt-2"></div>
	</v-navigation-drawer>
	<v-main class="mh-100">
		<div class="w-100 mh-100 pa-2 d-flex flex-column">
			<NuxtPage />
		</div>
	</v-main>
</v-layout>
</template>
