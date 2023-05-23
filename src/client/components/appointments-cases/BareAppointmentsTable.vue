<script setup lang="ts">
import {computed} from "#imports";
import {AppointmentBareData} from "../../../common/db-types";
import {compareDates, dateFormat} from "../../../common/utils/functions";
import {Nuly} from "../../../common/utils/types";
import {DataTableHeader, TypedDataTableHeader} from "../../utils/types";

type AppointmentDataDisplayable = Omit<AppointmentBareData, "timestamp" | "openedOn"> & {
	timestamp?: Date | Nuly,
	openedOn: Date,
};

const props = defineProps<{
	appointments: AppointmentBareData[] | Nuly,
	class?: string,
	otherUserTitle: string,
	showCaseId?: boolean
}>();

const dataTableHeaders = computed((args) => {
	const res: TypedDataTableHeader<AppointmentDataDisplayable>[] = [
		{title: 'Appt. ID', align: 'start', key: 'id', sortable: true},
		{title: props.otherUserTitle + " ID", align: 'start', key: 'othId', sortable: true},
		{title: props.otherUserTitle, align: 'start', key: 'othName', sortable: true},
		{title: 'Timestamp', align: 'start', key: 'timestamp', sortable: true, sort: compareDates},
		{title: 'Opened on', align: 'start', key: 'openedOn', sortable: true, sort: compareDates},
	];
	if (props.showCaseId === true) {
		res.push({title: 'Case ID', align: 'start', key: 'caseId', sortable: true},);
	}
	return res as unknown as DataTableHeader[];
});

const appointments = computed(() =>
	props.appointments?.map((val: AppointmentBareData) => {
		return {
			...val,
			openedOn:  new Date(val.openedOn)!,
			timestamp: val.timestamp == null ? null : new Date(val.timestamp),
		} as AppointmentDataDisplayable;
	}) ?? []);
</script>

<template>
<v-data-table
	:headers="dataTableHeaders"
	:items="appointments"
	items-per-page="5"
	density="compact"
	:class="`elevation-3 ${props.class??''}`"
	v-if="appointments.length>0">
	<template v-slot:item.timestamp="{ item }">
	{{ dateFormat(item.raw.timestamp) }}
	</template>
	<template v-slot:item.openedOn="{ item }">
	{{ dateFormat(item.raw.openedOn) }}
	</template>
</v-data-table>
<v-card v-else text="No data found" :class="props.class" />
</template>
