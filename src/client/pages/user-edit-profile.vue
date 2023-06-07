<script setup lang="ts">
import {navigateTo} from "#app";
import {definePageMeta, ref, useHead, watch} from "#imports";
import {isLeft} from "fp-ts/lib/Either";
import isEmpty from "lodash/isEmpty";
import {FieldContext, useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {ClientDataResult} from "../../common/db-types";
import {genderHumanVals} from "../../common/utils/constants";
import {genderDBToHuman, genderHumanToDB, nullOrEmptyCoalesce} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import FormTextFieldInCol from "../components/general/FormTextFieldInCol.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {justiceFirmApi} from "../utils/api-fetcher-impl";
import {readFileAsDataUrl, validateDataUrlAsPhotoBrowserSide} from "../utils/functions";
import {FormTextFieldData} from "../utils/types";
import {getEditProfileSchemaForClient} from "../utils/validation-schemas";

definePageMeta({
	middleware: "user-but-not-lawyer-page"
});

useHead({title: () => "Edit profile"});

let validationSchema         = yup.object({
	...getEditProfileSchemaForClient(),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name          = useField('name');
// const oldPassword   = useField('oldPassword');
const newPassword   = useField('newPassword');
const reNewPassword = useField('reNewPassword');
const phone         = useField('phone');
const address       = useField('address');
const photo         = useField('photo');
const gender        = useField('gender') as FieldContext<string | Nuly>;

const email = ref<string | Nuly>();

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
	// {field: oldPassword, label: "Old Password", cols: 12, lg: 4, type: "password"},
	{field: newPassword, label: "New Password", cols: 12, lg: 4, type: "password"},
	{field: reNewPassword, label: "Retype New Password", cols: 12, lg: 4, type: "password"},
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
	const authToken = userStore.authToken;
	if (authToken == null) {
		await navigateTo("/");
		await error("Not signed in");
		return;
	}

	if (photoData != null && !photoData.startsWith("data:")) {
		await error("Upload a proper photo file");
		return;
	}
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	if (nullOrEmptyCoalesce(values.newPassword, null) != nullOrEmptyCoalesce(values.reNewPassword, null)) {
		await error("Password & retyped password must match");
		return;
	}
	const res = await justiceFirmApi.updateProfile({
		authToken,
		name:        values.name,
		newPassword: nullOrEmptyCoalesce(values.newPassword, undefined),
		photoData:   nullOrEmptyCoalesce(photoData, undefined),
		address:     values.address,
		phone:       values.phone,
		gender:      genderHumanToDB(values.gender),
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error("Failed to sign up.");
		return;
	}
	userStore.signIn(res.right.body);
	message /*not-awaiting*/("Updated profile successfully");
	await navigateTo("/user-profile");
});

watch(() => userStore.authToken, async value => {
	const authToken = userStore.authToken;
	if (authToken == null) {
		await navigateTo("/");
		await error("Not signed in");
		return;
	}

	const res = await justiceFirmApi.getSelfProfile({authToken: authToken});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		// Should never happen
		console.log(res);
		await navigateTo("/");
		await error("Failed to get your profile details");
		return;
	}

	const profile       = res.right.body as ClientDataResult;
	name.value.value    = profile.name;
	phone.value.value   = profile.phone;
	address.value.value = profile.address;
	photo.value.value   = profile.photoPath;
	gender.value.value  = genderDBToHuman(profile.gender);
	email.value         = profile.email;
}, {immediate: true});
</script>

<template>
<v-form @submit.prevent="onSubmit" novalidate>
	<v-card color="gradient--sea-strike">
		<v-card-title>
			<p class="mb-4 text-wrap">
				<span class="text-h3 me-2">Update your profile</span>
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
				<v-col
					class="py-0"
					cols="12"
					lg="4">
					<v-text-field
						:model-value="email"
						label="Email"
						density="comfortable"
						readonly
						type="email"
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
					:disabled="!isEmpty(errors)">Update profile
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
</template>
