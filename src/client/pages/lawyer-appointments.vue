<script setup lang="ts">
import {definePageMeta, useHead} from "#imports";
import AppointmentsPage from "../components/appointments-cases/AppointmentsPage.vue";

definePageMeta({
	middleware: "lawyer-only-page"
});

useHead({title: () => "Appointments"});
</script>

<template>
<AppointmentsPage other-user-title="Client" />
</template>
