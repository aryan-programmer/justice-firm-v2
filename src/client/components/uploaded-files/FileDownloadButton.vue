<script setup lang="ts">
import {BtnVariants, computed, getFontAwesomeIconFromMIME} from "#imports";
import {Nuly} from "../../../common/utils/types";
import {FileUploadData} from "../../../server/common/utils/types";

const props = defineProps<{
	file: FileUploadData,
	buttonText?: string | Nuly,
	class?: string | Nuly,
	color?: string | Nuly,
	variant?: BtnVariants | Nuly,
}>();

const fileName = computed(() => props.buttonText ?? props.file.name ?? "Unnamed");
</script>

<template>
<v-btn
	:class="`px-3 ${props.class??''}`"
	:color="props.color??'blue-lighten-3'"
	:variant="props.variant??'elevated'"
	density="compact"
	rounded
	:href="file.path"
	target="_blank"
	rel="noopener noreferrer"
>
	<!--	<template #prepend>
		<v-icon icon="fa-download" />
		</template>-->
	<v-icon :icon="getFontAwesomeIconFromMIME(props.file.mime)" class="me-1" />
	{{ fileName }}
</v-btn>
</template>
