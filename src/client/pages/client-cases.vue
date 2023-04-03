<script setup lang="ts">
import {definePageMeta, onMounted, ref} from "#imports";
import {CaseSparseData} from "../../common/api-schema";
import {Nuly} from "../../common/utils/types";
import CasesTable from "../components/CasesTable.vue";
import {useUserStore} from "../store/userStore";
import {fetchCasesIntoRef} from "../utils/functions";

definePageMeta({
	middleware: "client-only-page"
});

const userStore = useUserStore();
const cases     = ref<CaseSparseData[] | Nuly>(null);

onMounted(async () => {
	await fetchCasesIntoRef(cases, userStore);
});
</script>

<template>
<h1>View Cases</h1>
<CasesTable other-user-title="Lawyer" :cases="cases" class="bg-amber-lighten-3" />
</template>
