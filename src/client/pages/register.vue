<script setup lang="ts">
import {navigateTo} from "#app";
import {definePageMeta} from "#imports";
import {isLeft} from "fp-ts/lib/Either";
import isEmpty from "lodash/isEmpty";
import {FieldContext, useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {genderHumanVals} from "../../common/utils/constants";
import {genderHumanToDB} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import FormTextFieldInCol from "../components/general/FormTextFieldInCol.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {justiceFirmApi} from "../utils/api-fetcher-impl";
import {readFileAsDataUrl, validateDataUrlAsPhotoBrowserSide} from "../utils/functions";
import {FormTextFieldData} from "../utils/types";
import {getRegistrationSchemaForClient} from "../utils/validation-schemas";

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
const gender     = useField('gender') as FieldContext<string | Nuly>;

// const photoInputRef = ref();

const modals           = useModals();
const userStore        = useUserStore();
const {message, error} = modals;

let photoData: string | null | undefined = null;

const textFields1: FormTextFieldData[] = [
	{field: name, label: "Name", cols: 12, lg: 4, type: "text"},
];
const genderFieldLg                    = 4;
const textFields2: FormTextFieldData[] = [
	{field: phone, label: "Phone", cols: 12, lg: 4, type: "text"},
	{field: email, label: "Email", cols: 12, lg: 4, type: "text"},
	{field: password, label: "Password", cols: 12, lg: 4, type: "password"},
	{field: rePassword, label: "Retype Password", cols: 12, lg: 4, type: "password"},
];

function photoClear (event: unknown) {
	photo.setValue(null);
	photoData = null;
}

async function photoChange (event: Event) {
	photo.handleChange(event);
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if (file == null) return;
	const dataUrl = await readFileAsDataUrl(file);
	if (await validateDataUrlAsPhotoBrowserSide(dataUrl, modals)) {
		photoData = dataUrl;
	} else {
		photoClear(null);
	}
}

const onSubmit = handleSubmit(async values => {
	if (photoData == null || !photoData.startsWith("data:")) {
		await error("Upload a photo file first");
		return;
	}
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	const res = await justiceFirmApi.registerClient({
		name:     values.name,
		email:    values.email,
		password: values.password,
		photoData,
		address:  values.address,
		phone:    values.phone,
		gender:   genderHumanToDB(values.gender),
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error("Failed to sign up.");
		return;
	}
	userStore.signIn(res.right.body);
	message /*not-awaiting*/("Registered as a client successfully");
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
				<FormTextFieldInCol v-for="field in textFields1" :field="field" />
				<v-col
					class="py-0"
					:cols="12"
					:lg="genderFieldLg"
				>
					<v-select
						@blur="gender.handleBlur"
						v-model="gender.value.value"
						:error-messages="gender.errorMessage.value ?? []"
						label="Gender"
						density="comfortable"
						:items="genderHumanVals"
					/>
				</v-col>
				<FormTextFieldInCol v-for="field in textFields2" :field="field" />
				<v-col class="py-0" cols="12">
					<v-textarea
						v-model="address.value.value"
						:error-messages="address.errorMessage.value ?? []"
						label="Address"
						rows="3"
						density="compact"
					/>
				</v-col>
				<v-col class="py-0" cols="12">
					<v-file-input
						:prepend-icon="null as any"
						prepend-inner-icon="fas fa-image-portrait"
						:error-messages="photo.errorMessage.value ?? []"
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
					color="orange-lighten-2"
					:disabled="!isEmpty(errors)">Register
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
</template>
