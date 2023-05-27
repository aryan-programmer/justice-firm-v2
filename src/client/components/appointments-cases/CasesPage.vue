<script setup lang="ts">
import {onMounted, ref} from "#imports";
import {CaseSparseData} from "../../../common/rest-api-schema";
import {Nuly} from "../../../common/utils/types";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import {fetchCasesIntoRef} from "../../utils/functions";
import CasesTable from "./CasesTable.vue";

const props = defineProps<{
	otherUserTitle: string,
}>();

const modals    = useModals();
const userStore = useUserStore();
const cases     = ref<CaseSparseData[] | Nuly>(null);
const isLoading = ref<boolean>(false);

onMounted(async () => {
	await fetchCasesIntoRef(cases, isLoading, userStore, modals);
});
</script>

<template>
<h1>View Cases</h1>
<CasesTable :other-user-title="props.otherUserTitle" :cases="cases" class="bg-blue-lighten-3" :is-loading="isLoading" />
</template>
