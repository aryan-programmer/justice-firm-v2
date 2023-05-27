<script setup lang="ts">
import {definePageMeta} from "#imports";
import AppointmentsPage from "../components/appointments-cases/AppointmentsPage.vue";

definePageMeta({
	middleware: "client-only-page"
});
</script>

<template>
<AppointmentsPage other-user-title="Lawyer" />
</template>
