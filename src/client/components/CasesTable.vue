<script setup lang="ts">
import {computed} from "#imports";
import {CaseSparseData} from "../../common/api-schema";
import {CaseType} from "../../common/db-types";
import {compareDates, dateFormat, trimStr} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {DataTableHeader} from "../utils/types";

type CaseDataDisplayable = Omit<CaseSparseData, "openedOn"> & {
	openedOn: Date,
	caseName: string,
};

const props = defineProps<{
	cases: CaseSparseData[] | Nuly,
	class?: string,
	otherUserTitle: string,
}>();

function compareCaseTypeNames (a: CaseType, b: CaseType) {
	return a.name.localeCompare(b.name);
}

const dataTableHeaders = computed((args): DataTableHeader<CaseDataDisplayable>[] => {
	return [
		{title: props.otherUserTitle, align: 'start', key: 'othName', sortable: true},
		{title: 'Description', align: 'start', key: 'description', sortable: true},
		{title: 'Case Type', align: 'start', key: 'caseName', sortable: true},
		{title: 'Opened on', align: 'start', key: 'openedOn', sortable: true, sort: compareDates},
		{title: 'View more', align: 'start', key: 'id', sortable: true},
	]
});

const cases = computed(() =>
	props.cases?.map((val) => {
		return {
			...val,
			caseName:    val.caseType.name,
			openedOn:    new Date(val.openedOn),
			description: trimStr(val.description),
		} as CaseDataDisplayable;
	}) ?? []);
</script>

<template>
<v-data-table
	:headers="dataTableHeaders"
	:items="cases"
	items-per-page="5"
	density="compact"
	:class="`elevation-3 ${props.class??''}`"
	v-if="cases.length>0">
	<template v-slot:item.openedOn="{ item }">
	{{ dateFormat(item.raw.openedOn) }}
	</template>
	<template v-slot:item.id="{ item }">
	<NuxtLink :href="`/case-details?id=${item.raw.id}`">View more</NuxtLink>
	</template>
</v-data-table>
<v-card v-else text="No data found" :class="props.class" />
</template>
