<script setup lang="ts">
import {computed} from "#imports";
import {Nuly} from "../../../common/utils/types";
import {FileUploadData} from "../../../server/common/utils/types";

const props = defineProps<{
	file: FileUploadData,
	imageSize?: string | Nuly
}>();
const emit  = defineEmits<{
	(on: 'imageLoad'): void
}>();

const sizeClass = computed(() =>
	props.imageSize == null || props.imageSize === "md" ?
	'clamp-image-height' :
	('clamp-image-height-' + props.imageSize)
);

function onLoad () {
	emit('imageLoad')
}
</script>

<template>
<v-img
	v-if="props.file.mime.startsWith('image/')"
	:src="props.file.path"
	:class="sizeClass"
	@load="onLoad" />
</template>
