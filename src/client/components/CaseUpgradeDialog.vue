<script setup lang="ts">
import {computed, justiceFirmApi, ref, useRouter} from "#imports";
import {watch} from "@vue/runtime-core";
import {isLeft} from "fp-ts/Either";
import {LawyerAuthToken} from "../../common/api-types";
import {CaseType} from "../../common/db-types";
import {UpgradeAppointmentToCaseInput} from "../../common/rest-api-schema";
import {nn} from "../../common/utils/asserts";
import {getCaseTypes} from "../../common/utils/constants";
import {isNullOrEmpty, nullOrEmptyCoalesce, trimStr} from "../../common/utils/functions";
import {useUserStore} from "../store/userStore";

const props = defineProps<{
	appointmentId: string
	defaultDescription?: string
}>();

const caseTypes = getCaseTypes();
const userStore = useUserStore();
const router    = useRouter();

const upgradeToCaseDialogOpen = ref<boolean>(false);
const chatGroupName           = ref<string>();
const caseDescription         = ref<string>();
const caseType                = ref<CaseType | null>(null);
const dataValid               = computed(() =>
	caseType.value != null &&
	!isNullOrEmpty(caseDescription.value) &&
	!isNullOrEmpty(chatGroupName.value)
);

async function upgradeAppointmentToCase () {
	if (!dataValid.value) return;
	upgradeToCaseDialogOpen.value             = false;
	const body: UpgradeAppointmentToCaseInput = {
		appointmentId: props.appointmentId,
		description:   nullOrEmptyCoalesce(caseDescription.value, null),
		type:          nn(caseType.value).id,
		authToken:     nn(userStore.authToken) as LawyerAuthToken,
		groupName:     chatGroupName.value,
	};
	console.log(body);
	// return;
	const res = await justiceFirmApi.upgradeAppointmentToCase(body);
	if (isLeft(res) || !res.right.ok || (res.right.body == null || typeof res.right.body != "string")) {
		console.log(res);
		alert(`Failed to upgrade appointment to a case`);
		return;
	}
	alert(`Successfully upgraded appointment to a case`);
	await router.push("/case-details?id=" + res.right.body)
}

watch(() => props.defaultDescription, (value, oldValue, onCleanup) => {
	chatGroupName.value   = trimStr(value ?? "");
	caseDescription.value = value;
}, {immediate: true});

</script>

<template>
<v-dialog
	v-model="upgradeToCaseDialogOpen"
	width="md"
>
	<template v-slot:activator="{ props }">
	<v-btn
		class="ma-1"
		variant="elevated"
		elevation="3"
		color="blue-lighten-2"
		rounded="pill"
		v-bind="props"
	>
		Upgrade to a case
	</v-btn>
	</template>
	<v-card color="gradient--alchemist-lab" class="pa-3" rounded="lg">
		<v-card-title class="text-h5">
			Upgrade appointment to a case
		</v-card-title>
		<v-card-text>
			<v-textarea
				v-model="caseDescription"
				label="Case description"
				density="comfortable"
				required
			/>
			<v-text-field
				v-model="chatGroupName"
				label="Chat Group Name"
				density="compact"
				required
			/>
			<v-select
				v-model="caseType"
				:items="caseTypes"
				item-title="name"
				item-value="id"
				density="comfortable"
				label="Case type"
				return-object
				single-line
			></v-select>
		</v-card-text>
		<v-card-actions>
			<v-btn
				color="green-darken-1"
				:elevation="dataValid ? 3 : 0"
				:variant="dataValid ? 'elevated' : 'flat'"
				rounded="pill"
				:disabled="!dataValid"
				@click="upgradeAppointmentToCase"
			>
				Confirm
			</v-btn>
			<v-btn
				color="red-darken-3"
				variant="flat"
				rounded="pill"
				@click="upgradeToCaseDialogOpen = false"
			>
				Close
			</v-btn>
		</v-card-actions>
	</v-card>
</v-dialog>
</template>
