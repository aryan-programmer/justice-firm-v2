<script setup lang="ts">
import {computed, readFileAsDataUrl, ref} from "#imports";
import isEmpty from "lodash/isEmpty";
import {useField, useForm} from "vee-validate";
import * as yup from "yup";
import {nn} from "../../../common/utils/asserts";
import {isNullOrEmpty} from "../../../common/utils/functions";
import {Nuly} from "../../../common/utils/types";
import {useModals} from "../../store/modalsStore";
import {UploadFileWithDescriptionDialogEventData} from "../../utils/types";

const props = defineProps<{
	title: string,
	bgColor: string,
	descriptionFieldName: string,
	buttonText?: string | Nuly,
	buttonIcon?: string | Nuly,
}>();
const emit  = defineEmits<{
	(on: 'uploadFile', data: UploadFileWithDescriptionDialogEventData): void
}>()

let validationSchema         = yup.object({
	attachment:  yup.string().min(1).required().label("Attachment"),
	description: yup.string().required().label(props.descriptionFieldName ?? "Description")
});
const form                   = useForm({
	validationSchema: validationSchema,
});
const {handleSubmit, errors} = form;

const attachment  = useField('attachment');
const description = useField('description');

const {message, error} = useModals();

const isDialogOpen = ref<boolean>(false);
const dataValid    = computed(() => isEmpty(errors.value));

let attachmentName: string | Nuly = null;
let attachmentData: string | Nuly = null;

async function attachmentChange (event: Event) {
	attachment.handleChange(event);
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if (file == null) return;
	attachmentData = await readFileAsDataUrl(file);
	attachmentName = file.name;
	if (isNullOrEmpty((description.value.value as any)?.toString()))
		description.value.value = file.name;
}

function attachmentClear () {
	attachment.setValue(null);
	attachmentData = null;
}

const uploadFile = handleSubmit(async (values) => {
	if (attachmentData == null || !attachmentData.startsWith("data:") || attachmentName == null) {
		await error("Upload an attachment file first");
		return;
	}
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	isDialogOpen.value = false;
	form.resetForm();
	emit("uploadFile", {
		attachmentName:    nn(attachmentName),
		attachmentDataUrl: attachmentData,
		description:       (values.description as any)?.toString()
	});
});

function close () {
	isDialogOpen.value = false;
	form.resetForm();
}
</script>

<template>
<v-dialog v-model="isDialogOpen">
	<template v-slot:activator="{props}">
	<slot name="activator" :activatorProps="props" />
	</template>
	<v-form @submit.prevent="uploadFile" novalidate>
		<v-card :color="props.bgColor" class="pa-1" rounded="lg">
			<v-card-title class="text-h5">{{ props.title }}</v-card-title>
			<v-card-text>
				<v-file-input
					class="w-100"
					:prepend-icon="null"
					prepend-inner-icon="fas fa-paperclip"
					@change="attachmentChange"
					:error-messages="attachment.errorMessage.value"
					@blur="attachment.handleBlur"
					label="Attachment File"
					density="compact"
					@click:clear="attachmentClear"
				/>
				<v-textarea
					v-model="description.value.value"
					hide-details
					:label="descriptionFieldName"
					rows="2"
					density="compact"
				/>
			</v-card-text>
			<v-card-actions>
				<v-btn
					color="green-darken-1"
					:elevation="dataValid ? 3 : 0"
					:variant="dataValid ? 'elevated' : 'flat'"
					rounded="pill"
					:disabled="!dataValid"
					type="submit"
				>
					<template v-slot:prepend>
					<v-icon :icon="props.buttonIcon" class="ml-1" v-if="props.buttonIcon!=null" />
					</template>
					{{ props.buttonText ?? props.title }}
				</v-btn>
				<v-btn
					color="red-darken-3"
					variant="flat"
					rounded="pill"
					@click="close"
				>
					Close
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-form>
</v-dialog>
</template>
