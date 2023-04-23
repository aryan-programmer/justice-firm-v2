<script setup lang="ts">
import {definePageMeta, onMounted, ref} from "#imports";
import {CaseSparseData} from "../../common/rest-api-schema";
import {Nuly} from "../../common/utils/types";
import CasesTable from "../components/appointments-cases/CasesTable.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {fetchCasesIntoRef} from "../utils/functions";

definePageMeta({
	middleware: "lawyer-only-page"
});

const modals    = useModals();
const userStore = useUserStore();
const cases     = ref<CaseSparseData[] | Nuly>(null);

onMounted(async () => {
	await fetchCasesIntoRef(cases, userStore, modals);
});
</script>

<template>
<h1>View Cases</h1>
<CasesTable other-user-title="Client" :cases="cases" class="bg-amber-lighten-3" />
</template>
