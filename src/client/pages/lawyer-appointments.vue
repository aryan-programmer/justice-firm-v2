<script setup lang="ts">
import {definePageMeta, onMounted, ref} from "#imports";
import {AppointmentSparseData} from "../../common/api-schema";
import {Nuly} from "../../common/utils/types";
import AppointmentsTable from "../components/AppointmentsTable.vue";
import {useUserStore} from "../store/userStore";
import {fetchAppointmentsByCategory} from "../utils/functions";

definePageMeta({
	middleware: "lawyer-only-page"
});

const userStore             = useUserStore();
const waitingAppointments   = ref<AppointmentSparseData[] | Nuly>(null);
const confirmedAppointments = ref<AppointmentSparseData[] | Nuly>(null);
const rejectedAppointments  = ref<AppointmentSparseData[] | Nuly>(null);

onMounted(async () => {
	await fetchAppointmentsByCategory(waitingAppointments, rejectedAppointments, confirmedAppointments, userStore);
});
</script>

<template>
<h1>View appointments</h1>
<h2>Pending appointment requests</h2>
<AppointmentsTable other-user-title="Client" :appointments="waitingAppointments" class="bg-amber-lighten-3" />
<h2>Confirmed appointment requests</h2>
<AppointmentsTable other-user-title="Client" :appointments="confirmedAppointments" class="bg-green-lighten-3" />
<h2>Rejected appointment requests</h2>
<AppointmentsTable other-user-title="Client" :appointments="rejectedAppointments" class="bg-red-lighten-3" />
</template>
