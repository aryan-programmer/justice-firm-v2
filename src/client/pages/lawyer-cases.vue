<script setup lang="ts">
import {definePageMeta, useHead} from "#imports";
import CasesPage from "../components/appointments-cases/CasesPage.vue";

definePageMeta({
	middleware: "lawyer-only-page"
});

useHead({title: () => "Cases"});
</script>

<template>
<CasesPage other-user-title="Client" />
</template>
