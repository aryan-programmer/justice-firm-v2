<script setup lang="ts">
import {computed} from "#imports";
import {AppointmentSparseData} from "../../common/api-schema";
import {compareDates, dateFormat, trimStr} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {DataTableHeader} from "../utils/types";

type DateWithStr = { date: Date, str: string };
type AppointmentDataDisplayable = //AppointmentSparseData;
	Omit<AppointmentSparseData, "timestamp" | "openedOn"> & {
	timestamp?: Date | Nuly,
	openedOn: Date,
};

const props = defineProps<{
	appointments: AppointmentSparseData[] | Nuly,
	class?: string,
	otherUserTitle: string,
}>();

const dataTableHeaders = computed((args): DataTableHeader<AppointmentDataDisplayable>[] => {
	return [
		{title: props.otherUserTitle, align: 'start', key: 'othName', sortable: true},
		{title: 'Description', align: 'start', key: 'description', sortable: true},
		{title: 'Timestamp', align: 'start', key: 'timestamp', sortable: true, sort: compareDates},
		{title: 'Opened on', align: 'start', key: 'openedOn', sortable: true, sort: compareDates},
		{title: 'View more', align: 'start', key: 'id', sortable: true},
	]
});

const appointments = computed(() =>
	props.appointments?.map((val: AppointmentSparseData) => {
		const res       = val as Omit<AppointmentSparseData, "timestamp" | "openedOn"> as AppointmentDataDisplayable;
		res.description = trimStr(res.description);
		res.openedOn    = new Date(val.openedOn)!;
		res.timestamp   = val.timestamp == null ? null : new Date(val.timestamp);
		return res;
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
	<template v-slot:item.id="{ item }">
	<NuxtLink :href="`/appointment-details?id=${item.raw.id}`">View more</NuxtLink>
	</template>
</v-data-table>
<v-card v-else text="No data found" :class="props.class" />
</template>
