<script setup lang="ts">
import {CaseDocumentData} from "../../../common/db-types";
import {dateStringFormat} from "../../../common/utils/functions";
import {getFontAwesomeIconFromMIME} from "../../utils/functions";
import FilePreview from "../uploaded-files/FilePreview.vue";

const props = defineProps<{
	document: CaseDocumentData
}>();
const emit  = defineEmits<{
	(on: 'imageLoad'): void
}>();

function onLoad () {
	emit('imageLoad')
}
</script>

<template>
<v-card color="gradient--salt-mountain">
	<FilePreview :file="props.document.file" image-size="sm" @imageLoad="onLoad" />
	<v-card-text class="py-2">
		<div class="d-flex flex-row flex-wrap mb-1 align-center justify-space-evenly">
			<span class="text-center text-body-1">
				<v-icon :icon="getFontAwesomeIconFromMIME(props.document.file.mime)" class="mx-1" />
				<NuxtLink class="mx-1" :href="props.document.file.path" target="_blank" rel="noopener noreferrer">
					{{ props.document.file.name }}
				</NuxtLink>
			</span>
		</div>
		<p>
			Uploaded on: {{ dateStringFormat(props.document.uploadedOn) }}<br />
			Uploaded by: {{ props.document.uploadedBy.name }}
		</p>
		<pre class="pre-wrap text-body-2">Description:
{{ props.document.description }}</pre>
	</v-card-text>
	<v-card-actions class="py-1" style="min-height: unset;">
	</v-card-actions>
</v-card>
</template>
