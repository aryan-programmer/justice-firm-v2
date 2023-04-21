<script setup lang="ts">
import {computed, getFontAwesomeIconFromMIME} from "#imports";
import {FileUploadData} from "../../../server/utils/types";

const props = defineProps<{
	file: FileUploadData
}>();

const fileName = computed(() => props.file.name ?? "Unnamed");
</script>

<template>
<v-btn
	class="mx-auto text-none"
	color="gradient--shy-rainbow"
	variant="elevated"
	density="compact"
	elevation="3"
	:href="file.path"
	target="_blank"
	rel="noopener noreferrer"
>
	<template #prepend>
	<v-icon :icon="getFontAwesomeIconFromMIME(props.file.mime)" />
	<v-icon icon="fa-download" />
	</template>
	{{ fileName }}
</v-btn>
</template>
