<script setup lang="ts">
import {
	computed,
	definePageMeta,
	justiceFirmApi,
	navigateTo,
	ref,
	useHead,
	useRoute,
	useRouter,
	watch,
	withMessageBodyIfApplicable
} from "#imports";
import {isLeft} from "fp-ts/Either";
import {ClientDataResult, UserAccessType} from "../../common/db-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {Nuly} from "../../common/utils/types";
import ClientCard from "../components/details-cards/ClientCard.vue";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import ClientPlaceholderCard from "../components/placeholders/ClientPlaceholderCard.vue";
import LawyerPlaceholderCard from "../components/placeholders/LawyerPlaceholderCard.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";

definePageMeta({
	middleware: "yes-user-page"
});

useHead({title: () => "Profile page"});

const {message, error} = useModals();
const router           = useRouter();
const route            = useRoute();
const userStore        = useUserStore();
const profile          = ref<LawyerSearchResult | ClientDataResult | Nuly>();
const isLoading        = ref<boolean>(false);
const isLawyer         = computed(() => userStore.authToken?.userType === UserAccessType.Lawyer);

watch(() => userStore.authToken, async value => {
	const authToken = userStore.authToken;
	if (authToken == null) {
		await navigateTo("/");
		return;
	}
	const id = authToken.id;

	isLoading.value = true;
	// await sleep(5000);
	const res       = await justiceFirmApi.getSelfProfile({authToken: authToken});
	isLoading.value = false;
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		// Should never happen
		console.log(res);
		await navigateTo("/");
		await error(withMessageBodyIfApplicable("Failed to get your profile details", res));
		return;
	}

	profile.value = res.right.body;
}, {immediate: true});
</script>

<template>
<LawyerPlaceholderCard
	v-if="isLoading && isLawyer"
	show-case-specializations
	side-by-side
	show-statistics
	:num-extra-actions="1" />
<LawyerCard
	v-else-if="!isLoading && isLawyer && profile!=null"
	:lawyer="profile as LawyerSearchResult"
	side-by-side
	class="w-100"
	show-user-id
>
	<template #actions>
	<v-btn
		to="/lawyer-edit-profile"
		color="purple-darken-1"
		density="default"
		elevation="2"
		rounded
		variant="elevated">Edit profile
	</v-btn>
	</template>
</LawyerCard>
<div v-else class="d-flex flex-column">
	<ClientPlaceholderCard v-if="isLoading" side-by-side :num-actions="1" class="mx-auto" style="min-width: 500px" />
	<ClientCard
		v-else-if="profile!=null"
		:client="profile as ClientDataResult"
		side-by-side
		class="mx-auto"
		style="min-width: 50%">
		<template #actions>
		<v-btn
			to="/user-edit-profile"
			color="purple-darken-1"
			density="default"
			elevation="2"
			rounded
			variant="elevated">Edit profile
		</v-btn>
		</template>
	</ClientCard>
</div>
</template>
