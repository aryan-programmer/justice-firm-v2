<script setup lang="ts">
import {computed} from "#imports";
import {AppointmentBareData, StatusEnum} from "../../../common/db-types";
import BareAppointmentsTable from "./BareAppointmentsTable.vue";

const props = defineProps<{
	appointments: AppointmentBareData[]
}>();

const appointmentGroups = computed(() => {
	const waitingAppointments: AppointmentBareData[]   = [];
	const confirmedAppointments: AppointmentBareData[] = [];
	const rejectedAppointments: AppointmentBareData[]  = [];
	for (const a of props.appointments) {
		switch (a.status) {
		case StatusEnum.Rejected:
			rejectedAppointments.push(a);
			break;
		case StatusEnum.Confirmed:
			confirmedAppointments.push(a);
			break;
		case StatusEnum.Waiting:
			waitingAppointments.push(a);
			break;
		}
	}
	return {waitingAppointments, confirmedAppointments, rejectedAppointments};
});
</script>

<template>
<br />
<h2>Lawyer's Appointment Requests</h2>
<h3>Confirmed appointment requests</h3>
<BareAppointmentsTable
	other-user-title="Client"
	:appointments="appointmentGroups.confirmedAppointments"
	class="bg-green-lighten-3"
	show-case-id />

<br />
<h3>Pending appointment requests</h3>
<BareAppointmentsTable
	other-user-title="Client"
	:appointments="appointmentGroups.waitingAppointments"
	class="bg-amber-lighten-3" />

<br />
<h3>Rejected appointment requests</h3>
<BareAppointmentsTable
	other-user-title="Client"
	:appointments="appointmentGroups.rejectedAppointments"
	class="bg-red-lighten-3" />
</template>
