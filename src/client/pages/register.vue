<script setup lang="ts">
import {navigateTo} from "#app";
import {definePageMeta} from "#imports";
import {isLeft} from "fp-ts/lib/Either";
import {useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {getRegistrationSchemaForClient} from "../utils/validation-schemas";
import {maxDataUrlLen, maxFileSize} from "../../common/utils/constants";
import {useUserStore} from "../store/userStore";
import {justiceFirmApi} from "../utils/api-fetcher-impl";
import {readFileAsDataUrl} from "../utils/functions";

definePageMeta({
	middleware: "no-user-page"
});

let validationSchema         = yup.object({
	...getRegistrationSchemaForClient(),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name       = useField('name');
const email      = useField('email');
const password   = useField('password');
const rePassword = useField('rePassword');
const phone      = useField('phone');
const address    = useField('address');
const photo      = useField('photo');

// const photoInputRef = ref();

const userStore = useUserStore();

let photoData: string | null | undefined = null;

const textFields = [
	{field: name, label: "Name", cols: 12, lg: 4, type: "text"},
	{field: email, label: "Email", cols: 12, lg: 4, type: "text"},
	{field: phone, label: "Phone", cols: 12, lg: 4, type: "text"},
	{field: password, label: "Password", cols: 12, lg: 6, type: "password"},
	{field: rePassword, label: "Retype Password", cols: 12, lg: 6, type: "password"},
];

function photoClear (event: unknown) {
	photo.setValue(null);
}

async function photoChange (event: Event) {
	// console.log(event, 112);
	// console.log(photoInputRef);
	photo.handleChange(event);
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if (file == null) return;
	photoData = await readFileAsDataUrl(file);
	if (photoData.length > maxDataUrlLen) {
		alert(`The file must be less than ${maxFileSize} in size.`)
	}
}

const onSubmit = handleSubmit(async values => {
	if (photoData == null || !photoData.startsWith("data:")) {
		alert("Upload a photo file first");
		return;
	}
	if (!validationSchema.isType(values)) {
		alert("Invalid data");
		return;
	}
	const res = await justiceFirmApi.registerClient({
		body: {
			name:     values.name,
			email:    values.email,
			password: values.password,
			photoData,
			address:  values.address,
			phone:    values.phone,
		},
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert("Failed to sign up.")
		return;
	}
	console.log(res.right.body);
	alert("Registered as a client successfully");
	userStore.signIn(res.right.body);
	await navigateTo("/");
});
</script>

<template>
<v-form @submit.prevent="onSubmit" novalidate>
	<v-card color="gradient--sharpeye-eagle">
		<v-card-title>
			<p class="mb-4 text-wrap">
				<span class="text-h2 me-2">Register as a client</span>
				<NuxtLink class="text-h6" href="/register-lawyer">Are a lawyer? Register as one.</NuxtLink>
			</p>
		</v-card-title>
		<v-card-text>
			<v-row>
				<v-col
					class="py-0"
					v-for="field in textFields"
					:cols="field.cols"
					:lg="field.lg"
				>
					<v-text-field
						@blur="field.field.handleBlur"
						v-model="field.field.value.value"
						:error-messages="field.field.errorMessage.value"
						:label="field.label"
						density="comfortable"
						:type="field.type"
					/>
				</v-col>
				<v-col class="py-0" cols="12">
					<v-textarea
						v-model="address.value.value"
						:error-messages="address.errorMessage.value"
						label="Address"
						rows="3"
						density="compact"
					/>
				</v-col>
				<v-col class="py-0" cols="12">
					<v-file-input
						:prepend-icon="null"
						prepend-inner-icon="fas fa-image-portrait"
						:error-messages="photo.errorMessage.value"
						@change="photoChange"
						@blur="photo.handleBlur"
						label="Photo"
						density="comfortable"
						@click:clear="photoClear"
					/>
				</v-col>
			</v-row>
			<v-divider class="my-3" />
			<div>
				<v-btn
					rounded
					type="submit"
					name="submit"
					variant="elevated"
					value="y"
					color="orange-lighten-2">Register
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
</template>
