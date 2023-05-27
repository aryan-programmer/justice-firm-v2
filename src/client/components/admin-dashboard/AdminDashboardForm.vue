<script setup lang="ts">
import {justiceFirmApi, KeepAsIsEnum, reactive, StatusSelectionOptions} from "#imports";
import {isLeft} from "fp-ts/Either";
import {AdminAuthToken} from "../../../common/api-types";
import {LawyerSearchResult, StatusEnum} from "../../../common/db-types";
import {nn} from "../../../common/utils/asserts";
import {genderDBToHuman, nullOrEmptyCoalesce} from "../../../common/utils/functions";
import {Nuly} from "../../../common/utils/types";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";
import {statusSelectionOptionCoalesce} from "../../utils/functions";
import {DataTableHeader, TypedDataTableHeader} from "../../utils/types";
import AdminDashboardStatusSelectionCell from "./AdminDashboardStatusSelectionCell.vue";

const userStore        = useUserStore();
const {message, error} = useModals();
const props            = defineProps<{
	lawyers: LawyerSearchResult[],
	displayCurrentStatus?: boolean
}>();
const emit             = defineEmits<{
	(type: 'applySuccess'): void
}>();

type Header_T = TypedDataTableHeader<LawyerSearchResult>;
const baseDataTableHeaders1: Header_T[]            = [
	{title: "ID", align: 'center', key: 'id', sortable: true},
	{title: "Action", align: 'start', key: 'status', sortable: true},
	{title: 'Photo', align: 'start', key: 'photoPath', sortable: false},
	{title: 'Name & Gender', align: 'start', key: 'name', sortable: true},
	{title: 'Contact info & Certification', align: 'start', key: 'email', sortable: true},
	{title: 'Address', align: 'start', key: 'address', sortable: true},
	{title: 'Rejection Reason', align: 'start', key: "rejectionReason", sortable: false},
];
const baseDataTableHeaders2: Header_T[]            = [
	{title: 'Total Cases', align: 'center', key: "statistics.totalCases", sortable: true},
	{title: 'Total Clients', align: 'center', key: "statistics.totalClients", sortable: true},
	{title: 'Total Appointments', align: 'center', key: "statistics.totalAppointments", sortable: true},
	{title: 'Rejected Appointments', align: 'center', key: "statistics.rejectedAppointments", sortable: true},
	{title: 'Confirmed Appointments', align: 'center', key: "statistics.confirmedAppointments", sortable: true},
	{title: 'Waiting Appointments', align: 'center', key: "statistics.waitingAppointments", sortable: true},
];
const baseDataTableHeaders: Header_T[]             = [
	...baseDataTableHeaders1,
	...baseDataTableHeaders2
];
const baseDataTableHeadersWithDistance: Header_T[] = [
	...baseDataTableHeaders1,
	{title: 'Distance', align: 'center', key: "distance", sortable: true},
	...baseDataTableHeaders2
];

const isShowingDistance = computed(() => props.lawyers.some(value => "distance" in value && typeof value.distance === "number"))
const dataTableHeaders  = computed(() => isShowingDistance.value ? baseDataTableHeadersWithDistance : baseDataTableHeaders);

const formFields = reactive<{
	statuses: Record<string | number, StatusSelectionOptions>,
	newRejectionReasons: Record<string | number, string | Nuly>,
}>({
	statuses:            {},
	newRejectionReasons: {}
});

watch(() => props.lawyers, (lawyers) => {
	const currentRejectionReasons: Record<string | number, string | Nuly> = {};
	for (const lawyer of lawyers) {
		const vId                    = "id" + lawyer.id;
		currentRejectionReasons[vId] = lawyer.rejectionReason;
	}
	formFields.newRejectionReasons = currentRejectionReasons;
}, {immediate: true});

async function onApply () {
	const confirmed = [] as string[];
	const rejected  = [] as { id: string, reason: string }[];
	const waiting   = [] as string[];
	for (const lawyer of props.lawyers) {
		const vId       = "id" + lawyer.id;
		const id        = lawyer.id;
		const setStatus = formFields.statuses[vId] ?? KeepAsIsEnum.KeepAsIs;
		if (setStatus === StatusEnum.Waiting) {
			waiting.push(id);
		} else if (setStatus === StatusEnum.Confirmed) {
			confirmed.push(id);
		} else if (setStatus === StatusEnum.Rejected ||
		           (setStatus === KeepAsIsEnum.KeepAsIs &&
		            lawyer.status === StatusEnum.Rejected &&
		            lawyer.rejectionReason !== formFields.newRejectionReasons[vId])
		) {
			rejected.push({
				id,
				reason: nullOrEmptyCoalesce(formFields.newRejectionReasons[vId], "No reason specified")
			});
		}
	}
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

<style scoped lang="scss">
$table-padding: 8px;
.v-table > .v-table__wrapper > table > tbody > tr > td, .v-table > .v-table__wrapper > table > tbody > tr > th, .v-table > .v-table__wrapper > table > thead > tr > td, .v-table > .v-table__wrapper > table > thead > tr > th, .v-table > .v-table__wrapper > table > tfoot > tr > td, .v-table > .v-table__wrapper > table > tfoot > tr > th {
	padding-left: $table-padding !important;
	padding-right: $table-padding !important;

	&:first-child {
		padding-left: $table-padding*2 !important;
	}

	&:last-child {
		padding-right: $table-padding*2 !important;
	}
}

.smaller-input-text-size {
	& .v-field.v-field.v-field.v-field {
		--v-field-padding-start: 8px !important;
		--v-field-padding-end: 8px !important;
		--v-field-padding-top: 8px !important;
	}

	&.v-input--horizontal .v-input__append {
		-webkit-margin-start: 8px;
		margin-inline-start: 8px;
	}

	& textarea {
		font-size: 0.9rem !important;
	}
}
</style>

<template>
<v-data-table
	:headers="dataTableHeaders as unknown as DataTableHeader[]"
	:items="props.lawyers"
	items-per-page="15"
	density="compact"
	class="elevation-3 bg-gradient--gagarin-view">
	<template v-slot:item.status="{ item }">
	<AdminDashboardStatusSelectionCell
		v-model="formFields.statuses['id'+item.raw.id]"
		:display-current-status="props.displayCurrentStatus"
		:orig-val="item.raw.status" />
	</template>
	<template v-slot:item.photoPath="{ item }">
	<img :src="item.raw.photoPath" alt="Photo" width="100">
	</template>
	<template v-slot:item.name="{ item }">
	<p class="text-body-2">
		{{ item.raw.name }}<br />
		Gender: {{ genderDBToHuman(item.raw.gender) }}<br />
		<v-btn
			:to="`/lawyer-details?id=${item.raw.id}`"
			color="cyan-darken-4"
			density="compact"
			rounded
			variant="tonal">More details
		</v-btn>
	</p>
	</template>
	<template v-slot:item.email="{ item }">
	<p class="text-body-2">
		{{ item.raw.email }}<br />
		{{ item.raw.phone }}<br />
		<a :href="item.raw.certificationLink" class="text-light-green-darken-4 font-weight-bold">View certification</a>
	</p>
	</template>
	<template v-slot:item.address="{ item }">
	<pre class="pre-wrap text-body-2" style="min-width: 150px">{{ item.raw.address }}</pre>
	</template>
	<template v-slot:item.rejectionReason="{ item }">
	<v-textarea
		v-if="statusSelectionOptionCoalesce(formFields.statuses['id'+item.raw.id], item.raw.status) === StatusEnum.Rejected"
		v-model="formFields.newRejectionReasons['id'+item.raw.id]"
		density="compact"
		class="w-100 ma-1 text-body-2 smaller-input-text-size"
		variant="solo"
		hide-details
		label="Rejection reason"
		bg-color="red-lighten-3"
		style="min-width: 150px;"
		rows="3"
		@click:append="formFields.newRejectionReasons['id'+item.raw.id] = item.raw.rejectionReason"
	>
		<template #append>
		<v-icon icon="fa-arrow-rotate-left" size="sm" />
		</template>
	</v-textarea>
	<p v-else class="text-center">Not applicable</p>
	</template>
	<template v-slot:item.distance="{ item }">
	{{ (+item.raw.distance).toFixed(3) }} km
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
