<script setup lang="ts">
import {computed, justiceFirmApi, reactive, StatusSelectionOptions} from "#imports";
import {isLeft} from "fp-ts/Either";
import {AdminAuthToken} from "../../common/api-types";
import {StatusEnum} from "../../common/db-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {nn} from "../../common/utils/asserts";
import {useUserStore} from "../store/userStore";
import {DataTableHeader} from "../utils/types";
import AdminDashboardStatusSelectionCell from "./AdminDashboardStatusSelectionCell.vue";

const userStore = useUserStore();
const props     = defineProps<{
	waitingLawyers: LawyerSearchResult[],
	displayCurrentStatus?: boolean
}>();
const emit      = defineEmits<{
	(type: 'applySuccess'): void
}>();

const dataTableHeaders = computed((args): DataTableHeader<LawyerSearchResult>[] => {
	return [
		{title: "Action", align: 'start', key: 'id', sortable: false},
		{title: 'Photo', align: 'start', key: 'photoPath', sortable: false},
		{title: 'Name', align: 'start', key: 'name', sortable: true},
		{title: 'Email', align: 'start', key: 'email', sortable: true},
		{title: 'Phone', align: 'start', key: 'phone', sortable: true},
		{title: 'Address', align: 'start', key: 'address', sortable: true},
		{title: 'Certification', align: 'start', key: 'certificationLink', sortable: false},
	]
});

const formFields = reactive<{
	statuses: Record<string | number, StatusSelectionOptions>
}>({
	statuses: {}
});


async function onApply () {
	const confirmed = [] as string[];
	const rejected  = [] as string[];
	const waiting   = [] as string[];
	for (const vId of Object.keys(formFields.statuses)) {
		const id = vId.substring(2);
		switch (formFields.statuses[vId]) {
		case StatusEnum.Waiting:
			waiting.push(id);
			break;
		case StatusEnum.Rejected:
			rejected.push(id);
			break;
		case StatusEnum.Confirmed:
			confirmed.push(id);
			break;
		}
	}
	console.log({confirmed, rejected});
	const res = await justiceFirmApi.setLawyerStatuses({
		authToken: nn(userStore.authToken) as AdminAuthToken,
		rejected,
		confirmed,
		waiting,
	});
	if (isLeft(res) || !res.right.ok || (res.right.body != null && "message" in res.right.body)) {
		console.log(res);
		alert(`Failed to set lawyers' statuses`);
		return;
	}
	formFields.statuses = {};
	emit("applySuccess");
	alert(`Successfully applied lawyers' statuses`);
}
</script>

<style>
.no-min-w-btn {
	background: unset;
	min-width: 10px;
	padding: 0 5px;
}
</style>

<template>
<v-data-table
	:headers="dataTableHeaders"
	:items="props.waitingLawyers"
	items-per-page="15"
	density="compact"
	class="elevation-3 bg-gradient--gagarin-view">
	<template v-slot:item.id="{ item }">
	<AdminDashboardStatusSelectionCell
		v-model="formFields.statuses['id'+item.raw.id]"
		:display-current-status="props.displayCurrentStatus"
		:orig-val="item.raw.status" />
	</template>
	<template v-slot:item.address="{ item }">
	<pre>{{ item.raw.address }}</pre>
	</template>
	<template v-slot:item.photoPath="{ item }">
	<img :src="item.raw.photoPath" alt="Photo" width="150">
	</template>
	<template v-slot:item.certificationLink="{ item }">
	<a :href="item.raw.certificationLink" class="text-light-green-lighten-4 font-weight-bold">View certification</a>
	</template>
</v-data-table>
<v-btn
	rounded
	variant="elevated"
	value="y"
	class="mt-2"
	color="orange-lighten-2"
	@click="onApply">
	Apply
</v-btn>
</template>
