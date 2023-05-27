<script setup lang="ts">
import {definePageMeta} from "#imports";
import CasesPage from "../components/appointments-cases/CasesPage.vue";

definePageMeta({
	middleware: "client-only-page"
});
</script>

<template>
<CasesPage other-user-title="Lawyer" />
</template>
