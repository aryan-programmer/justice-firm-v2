<script setup lang="ts">
import {definePageMeta, useHead} from "#imports";
import AppointmentsPage from "../components/appointments-cases/AppointmentsPage.vue";

definePageMeta({
	middleware: "client-only-page"
});

useHead({title: () => "Appointments"});
</script>

<template>
<AppointmentsPage other-user-title="Lawyer" />
</template>
