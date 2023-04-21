<script setup lang="ts">
import {computed} from "#imports";
import {extension} from "mime-types";
import {FileUploadData} from "../../../server/utils/types";
import FileDownloadButton from "./FileDownloadButton.vue";

const props    = defineProps<{
	file: FileUploadData,
}>();
const emit     = defineEmits<{
	(on: 'imageLoad'): void
}>()
//gradient--sharp-glass
const fileName = computed(() => props.file.name ?? "Unnamed." + extension(props.file.mime));

function onLoad () {
	emit('imageLoad')
}
</script>

<template>
<v-card v-if="props.file.mime.startsWith('image/')" density="compact" color="gradient--sharp-glass">
	<v-img :src="props.file.path" class="clamp-image-height-lg" @load="onLoad" />
	<v-card-actions class="py-1" style="min-height: unset;">
		<FileDownloadButton :file="props.file" />
	</v-card-actions>
</v-card>
<FileDownloadButton v-else :file="props.file" />
</template>
