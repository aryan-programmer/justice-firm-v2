<script setup lang="ts">
import {computed, justiceFirmApi, reactive, StatusSelectionOptions} from "#imports";
import {isLeft} from "fp-ts/Either";
import {AdminAuthToken} from "../../../common/api-types";
import {StatusEnum} from "../../../common/db-types";
import {LawyerSearchResult} from "../../../common/db-types";
import {nn} from "../../../common/utils/asserts";
import {genderDBToHuman} from "../../../common/utils/functions";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import {DataTableHeader} from "../../utils/types";
import AdminDashboardStatusSelectionCell from "./AdminDashboardStatusSelectionCell.vue";

const userStore        = useUserStore();
const {message, error} = useModals();
const props            = defineProps<{
	waitingLawyers: LawyerSearchResult[],
	displayCurrentStatus?: boolean
}>();
const emit             = defineEmits<{
	(type: 'applySuccess'): void
}>();

const dataTableHeaders = computed((args): DataTableHeader<LawyerSearchResult>[] => {
	return [
		{title: "Action", align: 'start', key: 'status', sortable: true},
		{title: 'Photo', align: 'start', key: 'photoPath', sortable: false},
		{title: 'Name', align: 'start', key: 'name', sortable: true},
		{title: 'Email', align: 'start', key: 'email', sortable: true},
		{title: 'Phone', align: 'start', key: 'phone', sortable: true},
		{title: 'Address', align: 'start', key: 'address', sortable: true},
		{title: 'Gender', align: 'start', key: 'gender', sortable: false},
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
		await error(`Failed to set lawyers' statuses`);
		return;
	}
	formFields.statuses = {};
	emit("applySuccess");
	await message(`Successfully applied lawyers' statuses`);
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
	<template v-slot:item.status="{ item }">
	<AdminDashboardStatusSelectionCell
		v-model="formFields.statuses['id'+item.raw.id]"
		:display-current-status="props.displayCurrentStatus"
		:orig-val="item.raw.status" />
	</template>
	<template v-slot:item.gender="{ item }">
	{{ genderDBToHuman(item.raw.gender) }}
	</template>
	<template v-slot:item.address="{ item }">
	<pre class="pre-wrap text-body-2">{{ item.raw.address }}</pre>
	</template>
	<template v-slot:item.photoPath="{ item }">
	<img :src="item.raw.photoPath" alt="Photo" width="150">
	</template>
	<template v-slot:item.name="{ item }">
	{{ item.raw.name }}<br />
	<a :href="item.raw.certificationLink" class="text-light-green-darken-4 font-weight-bold">View certification</a>
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
