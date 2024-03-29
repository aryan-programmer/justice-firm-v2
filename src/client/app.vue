<script setup lang="ts">
import {useRouter} from "#app";
import {computed, navigateTo, useHead, useRoute, watch} from "#imports";
import {ref} from "vue";
import {useDisplay} from "vuetify";
import IconButton from "~/components/general/IconButton.vue";
import {UserAccessType} from "../common/db-types";
import LawyerStatusDisplayer from "./components/general/LawyerStatusDisplayer.vue";
import ModalDisplayer from "./components/general/ModalDisplayer.vue";
import NavItem from "./components/general/NavItem.vue";
import SnackbarListDisplayer from "./components/general/SnackbarListDisplayer.vue";
import {useNotificationsStore} from "./store/notificationsStore";
import {useUserStore} from "./store/userStore";
import {appointmentsIcon, casesIcon, gavelIcon} from "./utils/constants";

useHead({
	titleTemplate: (titleChunk) => {
		return titleChunk ? `${titleChunk} - Justice Firm` : 'Justice Firm';
	}
});

const userStore     = useUserStore();
const notifications = useNotificationsStore();

const isSideNavVisible      = ref(false);
const showingNotifications  = ref<boolean>(false);
const display               = useDisplay();
const {xs, width}           = display;
const hideSideNavBreakpoint = xs;
const notificationsMaxWidth = computed(() => xs.value ? width.value : width.value / 2);
const rail                  = computed(() => !hideSideNavBreakpoint.value);

const router = useRouter();
const route  = useRoute();

const userInfo    = computed(() => {
	if (userStore.authToken == null) {
		return "Anonymous user";
	}
	let userType: string = "";
	switch (userStore.authToken.userType) {
	case UserAccessType.Lawyer:
		userType = "Lawyer";
		break;
	case UserAccessType.Client:
		userType = "Client";
		break;
	case UserAccessType.Admin:
		userType = "Administrator";
		break;
	}
	return userType + " " + userStore.authToken.name;
});
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
				{icon: gavelIcon, title: "Home", link: "/"},
				{icon: appointmentsIcon, title: "Appointments", link: "/lawyer-appointments"},
				{icon: casesIcon, title: "Cases", link: "/lawyer-cases"},
				{icon: "fa-id-badge", title: "Profile", link: "/user-profile"},
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
				{icon: appointmentsIcon, title: "Appointments", link: "/client-appointments"},
				{icon: casesIcon, title: "Cases", link: "/client-cases"},
				{icon: "fa-id-badge", title: "Profile", link: "/user-profile"},
			],
			color: "gradient--perfect-white",
			theme: "light",
			// mainIcon: {icon: "fa-gavel", title: "Home"},
		};
	case UserAccessType.Admin:
		return {
			links: [
				{icon: "fa-bug-slash", title: "Home", link: "/"},
				{icon: "fa-search", title: "Find Lawyer", link: "/search-lawyers"},
				{icon: "fa-table", title: "Search Lawyers Dashboard", link: "/admin-search-lawyers"},
				{icon: "fa-id-badge", title: "Profile", link: "/user-profile"},
				//{icon: "fa-table", title: "Admin Dashboard", link: "/admin-dashboard"},
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

async function notificationsViewMore () {
	showingNotifications.value = false;
	await navigateTo("/notifications");
}

watch(() => route.fullPath, value => {
	console.log(value);
	showingNotifications.value = false;
});
</script>

<style scoped lang="scss">
.app-bar-title-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	width: 100%;
}

.main-page-container {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	padding: 6px !important;
}

.notifications-actions-card {
	z-index: 10000;
	position: -webkit-sticky;
	position: sticky;
	top: 0px;

	& > .notifications-actions {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		flex-wrap: wrap;
		padding: 4px;
	}
}
</style>

<template>
<SnackbarListDisplayer />
<ModalDisplayer />
<LawyerStatusDisplayer />
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
		<v-menu
			v-if="userStore.authToken != null"
			v-model="showingNotifications"
			location="end"
			:close-on-content-click="false"
		>
			<template v-slot:activator="{ props }">
			<v-btn v-if="userStore.authToken != null" class="me-3" icon v-bind="props">
				<v-icon v-if="notifications.unreadNotifications.size === 0">fa-bell</v-icon>
				<v-badge v-else :content="notifications.unreadNotifications.size" color="blue">
					<v-icon>fa-bell</v-icon>
				</v-badge>
			</v-btn>
			</template>
			<v-card min-width="300" :max-width="notificationsMaxWidth" density="compact">
				<v-card-text class="mt-0 pt-0">
					<v-card
						elevation="1"
						color="blue-lighten-4"
						variant="flat"
						density="compact"
						class="notifications-actions-card rounded-b-lg rounded-t-0">
						<v-card-text class="notifications-actions">
							<IconButton
								class="px-2 visibility-hidden"
								variant="tonal"
								icon="fa-close" />
							<v-btn
								to="/notifications"
								density="compact"
								rounded
								color=""
								variant="tonal"
								@click="notificationsViewMore"
							>
								View More
							</v-btn>
							<IconButton
								class="px-2"
								variant="tonal"
								icon="fa-close"
								color="black"
								@click="showingNotifications=false" />
						</v-card-text>
					</v-card>
					<NotificationsList compact-ui />
				</v-card-text>
			</v-card>
		</v-menu>
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
		<div class="main-page-container">
			<NuxtPage />
		</div>
	</v-main>
</v-layout>
</template>
