<script setup lang="ts">
import {onMounted, ref} from "#imports";
import {AppointmentSparseData} from "../../../common/rest-api-schema";
import {Nuly} from "../../../common/utils/types";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import {fetchAppointmentsByCategory} from "../../utils/functions";
import AppointmentsTable from "./AppointmentsTable.vue";

const props = defineProps<{
	otherUserTitle: string,
}>();

const modals                          = useModals();
const userStore                       = useUserStore();
const waitingAppointments             = ref<AppointmentSparseData[] | Nuly>(null);
const confirmedAppointments           = ref<AppointmentSparseData[] | Nuly>(null);
const rejectedAppointments            = ref<AppointmentSparseData[] | Nuly>(null);
const areWaitingAppointmentsLoading   = ref<boolean>(false);
const areConfirmedAppointmentsLoading = ref<boolean>(false);
const areRejectedAppointmentsLoading  = ref<boolean>(false);

onMounted(async () => {
	await fetchAppointmentsByCategory({
		modals,
		userStore,
		waitingAppointments,
		confirmedAppointments,
		rejectedAppointments,
		areWaitingAppointmentsLoading,
		areConfirmedAppointmentsLoading,
		areRejectedAppointmentsLoading,
	});
});
</script>

<template>
<h1>View appointments</h1>
<h2>Pending appointment requests</h2>
<AppointmentsTable
	:other-user-title="props.otherUserTitle"
	:appointments="waitingAppointments"
	:is-loading="areWaitingAppointmentsLoading"
	class="bg-amber-lighten-3" />
<h2>Confirmed appointment requests</h2>
<AppointmentsTable
	:other-user-title="props.otherUserTitle"
	:appointments="confirmedAppointments"
	:is-loading="areConfirmedAppointmentsLoading"
	class="bg-green-lighten-3" />
<h2>Rejected appointment requests</h2>
<AppointmentsTable
	:other-user-title="props.otherUserTitle"
	:appointments="rejectedAppointments"
	:is-loading="areRejectedAppointmentsLoading"
	class="bg-red-lighten-3" />
</template>
