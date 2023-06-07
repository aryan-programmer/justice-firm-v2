<script setup lang="ts">
import {definePageMeta, useHead} from "#imports";
import CasesPage from "../components/appointments-cases/CasesPage.vue";

definePageMeta({
	middleware: "client-only-page"
});

useHead({title: () => "Cases"});
</script>

<template>
<CasesPage other-user-title="Lawyer" />
</template>
