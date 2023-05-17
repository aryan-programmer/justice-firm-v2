<!--<script setup lang="ts">-->
<!--import {useModals} from "../store/modalsStore";-->

<!--const modals = useModals();-->

<!--onMounted(async () => {-->
<!--});-->
<!--</script>-->

<style lang="scss">
.jumbotron-wrap {
	display: flex;
}

.jumbotron {
	/*width: 75%;*/
	text-align: center;
	width: fit-content;
	margin: 1em auto;

	& > div {
		padding: 0.5em;
	}
}
</style>

<template>
<div class="jumbotron-wrap">
	<v-card class="jumbotron bg-amber-lighten-3">
		<div>
			<h1 class="text-center">Justice Firm</h1>
			<p>Justice Firm is a website for lawyers and for clients to access their service.</p>
			<p>Justice Firm is a website where lawyers can register and clients/people/corporations can hire them according to their needs and requirement. </p>
			<NuxtLink href="/search-lawyers">Search for a lawyer now!</NuxtLink>
		</div>
	</v-card>
</div>
</template>
