<script setup lang="ts">
import {FileUploadData} from "../../../server/common/utils/types";
import {isFilePreviewable} from "../../utils/functions";
import FileDownloadButton from "./FileDownloadButton.vue";
import FilePreview from "./FilePreview.vue";

const props = defineProps<{
	file: FileUploadData,
}>();
const emit  = defineEmits<{
	(on: 'imageLoad'): void
}>();

function onLoad () {
	emit('imageLoad')
}
</script>

<template>
<v-card v-if="isFilePreviewable(props.file)" density="compact" color="gradient--sharp-glass">
	<FilePreview :file="props.file" @imageLoad="onLoad" image-size="lg" />
	<v-card-actions class="py-1" style="min-height: unset;">
		<FileDownloadButton :file="props.file" />
	</v-card-actions>
</v-card>
<FileDownloadButton v-else :file="props.file" />
</template>
