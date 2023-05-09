<script setup lang="ts">
import {Nuly} from "../../../common/utils/types";
import {Density, FormTextFieldData} from "../../utils/types";

const props = defineProps<{
	field: FormTextFieldData,
	density?: Density | Nuly
}>();
</script>

<template>
<v-col
	class="py-0"
	:cols="props.field.cols"
	:lg="props.field.lg"
>
	<v-text-field
		@blur="props.field.field.handleBlur"
		v-model="props.field.field.value.value"
		:error-messages="props.field.field.errorMessage.value ?? []"
		:label="props.field.label"
		:density="props.density ?? 'comfortable'"
		:type="props.field.type"
	/>
</v-col>
</template>
