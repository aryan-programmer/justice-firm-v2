<script setup lang="ts">
import {useField, useForm}              from 'vee-validate';
import * as yup                         from "yup";
import {getRegistrationSchemaForClient} from "~/utils/validationSchemas";

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

function photoChange (event: Event) {
	console.log(event, 112);
	photo.handleChange(event);
	const files      = (event.target as HTMLInputElement)?.files!;
	let filename     = files[0].name;
	const fileReader = new FileReader()
	fileReader.addEventListener('load', () => {
		const res = fileReader.result;
		if (typeof res !== "string") return;
		console.log(filename, typeof res, res.length);
	});
	fileReader.readAsDataURL(files[0]);
}

const onSubmit = handleSubmit(values => {
	console.log(JSON.stringify(values, null, 2));
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
