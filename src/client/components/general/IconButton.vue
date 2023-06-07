<script setup lang="ts">
import {computed} from "#imports";
import {BtnVariants} from "~/utils/types";
import {Nuly} from "~~/src/common/utils/types";

const props = defineProps<{
	icon: string,
	class?: string | Nuly,
	color?: string | Nuly,
	variant?: BtnVariants | Nuly,
}>();

const otherProps = computed(() => {
	const {icon, class: _, color, variant, ...res} = props;
	return res;
});

const events = defineEmits<{
	(event: "click", e: MouseEvent | KeyboardEvent): void
}>();

function click (e: MouseEvent | KeyboardEvent) {
	events("click", e);
}
</script>

<template>
<v-btn
	:class="`px-3 ${props.class??''}`"
	:color="props.color??'white'"
	:variant="props.variant??'elevated'"
	rounded
	density="compact"
	style="min-width: 0px;"
	@click="click"
	v-bind="otherProps">
	<v-icon>{{ props.icon }}</v-icon>
</v-btn>
</template>
