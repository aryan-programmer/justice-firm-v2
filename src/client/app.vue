<script setup lang="ts">
import {useRouter} from "#app";
import {computed, navigateTo} from "#imports";
import {ref} from "vue";
import {UserAccessType} from "../common/db-types";
import {useUserStore} from "./store/userStore";

const userStore = useUserStore();

const drawer = ref(true);
const rail   = ref(true);

const router = useRouter();

const userDeps = computed(args => {
	console.log(router.currentRoute.value);
	if (userStore.authToken == null) {
		return {
			links: [
				{icon: "fa-home", title: "Home", link: "/"},
				{icon: "fa-search", title: "Search Lawyers", link: "/search-lawyer"},
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
				{icon: "fa-table", title: "Lawyer Dashboard", link: "/lawyer-dashboard"},
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
				{icon: "fa-table", title: "Client Dashboard", link: "/client-dashboard"},
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
				{icon: "fa-search", title: "Search Lawyers", link: "/search-lawyer"},
				{icon: "fa-table", title: "Admin Dashboard", link: "/admin-dashboard"},
				// {icon: "fa-sign-out", title: "Sign out", link: "/sign-out"},
			],
			color: "gradient--premium-dark",
			theme: "dark",
		};
	}
});

userStore.$subscribe((mutation, state) => {
	console.log({authToken: userStore.authToken});
});

function signOut () {
	userStore.signOut();
}
</script>

<template>
<v-layout>
	<v-navigation-drawer
		v-model="drawer"
		:rail="rail"
		expand-on-hover
		permanent
		:color="userDeps.color"
		:theme="userDeps.theme"
	>
		<v-list-item
			title="Justice Firm"
			nav
		>
			<template v-slot:prepend>
			<v-avatar>
				<v-btn
					icon="fa-bars"
					color="red-lighten-3"
					@click="rail=!rail" />
			</v-avatar>
			</template>
			<template v-slot:append>
			<v-btn
				v-if="!rail"
				variant="text"
				icon="fa-chevron-left"
				@click.stop="rail = true"
			/>
			</template>
		</v-list-item>

		<v-divider></v-divider>

		<v-list density="compact" nav>
			<v-list-item
				v-for="link in userDeps.links"
				:prepend-icon="link.icon"
				:title="link.title"
				:value="link.link"
				:active="router.currentRoute.value.fullPath === link.link"
				@click="navigateTo(link.link)" />
			<v-list-item
				v-if="userStore.authToken!=null"
				prepend-icon="fa-sign-out"
				title="Sign out"
				value="sign-out"
				@click="signOut" />
		</v-list>
	</v-navigation-drawer>
	<v-main>
		<div class="w-100 pa-2">
			<NuxtPage />
		</div>
	</v-main>
</v-layout>
</template>
