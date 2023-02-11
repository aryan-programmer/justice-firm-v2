<script setup lang="ts">
import {useRouter} from "#app";
import {ref}       from "vue";

const drawer = ref(true);
const rail   = ref(true);

const router = useRouter();

const links = [
	{icon: "fa-gavel", title: "Home", link: "/"},
	{icon: "fa-search", title: "Search Lawyers", link: "search-laywer"},
	{icon: "fa-user-plus", title: "Register", link: '/register'},
	{icon: "fa-sign-in", title: "Sign in", link: "/sign-in"},
];
</script>

<template>
<v-layout>
	<v-navigation-drawer
		v-model="drawer"
		:rail="rail"
		expand-on-hover
		permanent
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
				v-for="link in links"
				:prepend-icon="link.icon"
				:title="link.title"
				:value="link.link"
				@click="router.push(link.link)" />
		</v-list>
	</v-navigation-drawer>
	<v-main>
		<div class="w-100 pa-2">
			<NuxtPage />
		</div>
	</v-main>
</v-layout>
</template>
