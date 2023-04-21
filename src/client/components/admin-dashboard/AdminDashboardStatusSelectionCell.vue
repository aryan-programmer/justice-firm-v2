<script setup lang="ts">
import {computed, StatusSelectionOptions} from "#imports";
import {StatusEnum} from "../../../common/db-types";
import {Nuly} from "../../../common/utils/types";
import {useUserStore} from "../../store/userStore";
import {confirmedColor, rejectedColor, waitingColor} from "../../utils/constants";
import {getColorFromStatus} from "../../utils/functions";
import {KeepAsIsEnum} from "../../utils/types";

const userStore = useUserStore();
const props     = defineProps<{
	origVal: StatusEnum | Nuly,
	modelValue: StatusSelectionOptions | Nuly,
	displayCurrentStatus?: boolean
}>();
const emit      = defineEmits<{
	(type: 'update:modelValue', value: StatusSelectionOptions): void
}>();
const isKeep    = computed(() => props.modelValue == null || props.modelValue === KeepAsIsEnum.KeepAsIs);

function updateModelVal (val: any) {
	emit("update:modelValue", val);
}
</script>

<template>
<div class="d-flex flex-column justify-center align-center">
	<v-btn
		v-if="props.displayCurrentStatus === true"
		:variant="isKeep?'flat':'text'"
		:active="isKeep"
		@click="updateModelVal(KeepAsIsEnum.KeepAsIs)"
		:color="isKeep?getColorFromStatus(props.origVal):'black'"
		class="w-100 p-2">
		Keep {{ props.origVal }}
	</v-btn>
	<v-btn-toggle
		class="mx-auto"
		:model-value="props.modelValue"
		@update:modelValue="updateModelVal"
		density="compact"
		rounded="2"
		mandatory
		group
	>
		<v-btn
			class="no-min-w-btn"
			density="compact"
			:color="confirmedColor"
			:value="StatusEnum.Confirmed">
			<v-icon icon="fa-check" />
		</v-btn>
		<v-btn
			class="no-min-w-btn"
			density="compact"
			:color="waitingColor"
			:value="StatusEnum.Waiting">
			<v-icon icon="fa-question" />
		</v-btn>
		<v-btn
			class="no-min-w-btn"
			density="compact"
			:color="rejectedColor"
			:value="StatusEnum.Rejected">
			<v-icon icon="fa-xmark" />
		</v-btn>
	</v-btn-toggle>
</div>
</template>
