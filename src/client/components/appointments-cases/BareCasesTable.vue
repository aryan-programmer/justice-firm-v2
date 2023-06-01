<script setup lang="ts">
import {computed} from "#imports";
import {CaseBareData, CaseType} from "../../../common/db-types";
import {compareDates, dateFormat} from "../../../common/utils/functions";
import {Nuly} from "../../../common/utils/types";
import {strToDate} from "../../../server/common/utils/date-to-str";
import {DataTableHeader, TypedDataTableHeader} from "../../utils/types";

type CaseDataDisplayable = Omit<CaseBareData, "openedOn"> & {
	openedOn: Date,
	caseName: string,
};

const props = defineProps<{
	cases: CaseBareData[] | Nuly,
	class?: string,
	otherUserTitle: string,
}>();

function compareCaseTypeNames (a: CaseType, b: CaseType) {
	return a.name.localeCompare(b.name);
}

const dataTableHeaders = computed((args) => {
	const res: TypedDataTableHeader<CaseDataDisplayable>[] = [
		{title: 'Case. ID', align: 'start', key: 'id', sortable: true},
		{title: props.otherUserTitle + " ID", align: 'start', key: 'othId', sortable: true},
		{title: props.otherUserTitle, align: 'start', key: 'othName', sortable: true},
		{title: 'Case Type', align: 'start', key: 'caseName', sortable: true},
		{title: 'Opened on', align: 'start', key: 'openedOn', sortable: true, sort: compareDates},
	];
	return res as unknown as DataTableHeader[];
});

const cases = computed(() =>
	props.cases?.map((val) => {
		return {
			...val,
			caseName: val.caseType.name,
			openedOn: strToDate(val.openedOn),
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
</v-data-table>
<v-card v-else text="No data found" :class="props.class" />
</template>
