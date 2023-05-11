<script setup lang="ts">
import {definePageMeta, justiceFirmApi, navigateTo, onMounted, readFileAsDataUrl, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import isEmpty from "lodash/isEmpty";
import {FieldContext, useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {ISchema} from "yup";
import {LawyerSearchResult} from "../../common/db-types";
import {UpdateLawyerProfileInput} from "../../common/rest-api-schema";
import {genderHumanVals, getCaseTypes, maxDataUrlLen, maxFileSize} from "../../common/utils/constants";
import {genderDBToHuman, genderHumanToDB, getCurrentPosition, nullOrEmptyCoalesce} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import FormTextFieldInCol from "../components/general/FormTextFieldInCol.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {validateDataUrlAsPhotoBrowserSide} from "../utils/functions";
import {FormTextFieldData} from "../utils/types";
import {getEditProfileSchemaForLawyer} from "../utils/validation-schemas";

definePageMeta({
	middleware: "lawyer-only-page"
});

let caseTypes                           = getCaseTypes();
let caseSpecializationsValidationSchema = yup.object(caseTypes.reduce((previousValue, currentValue) => {
	previousValue["id" + currentValue.id] = yup.string().optional().notRequired();
	return previousValue;
}, {} as Record<string, ISchema<any>>));

let validationSchema         = yup.object({
	...getEditProfileSchemaForLawyer(),
	caseSpecializations: caseSpecializationsValidationSchema,
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name                      = useField('name');
// const oldPassword   = useField('oldPassword');
const newPassword               = useField('newPassword');
const reNewPassword             = useField('reNewPassword');
const phone                     = useField('phone');
const address                   = useField('address');
const photo                     = useField('photo');
const gender                    = useField('gender');
const certificate               = useField('certificate');
const latitude                  = useField('latitude');
const longitude                 = useField('longitude');
const updateCaseSpecializations = ref<boolean>(false);
const email                     = ref<string | Nuly>();

const modals           = useModals();
const userStore        = useUserStore();
const {message, error} = modals;

let photoData: string | null | undefined       = null;
let certificateData: string | null | undefined = null;

const caseSpecializationsFields    = caseTypes.map(value => useField(`caseSpecializations.id${value.id}`));
const caseSpecializationFieldsById = caseTypes.reduce((previousValue, currentValue, i) => {
	previousValue["id" + currentValue.id] = caseSpecializationsFields[i];
	return previousValue;
}, {} as Record<string, FieldContext>);

const textFields1: FormTextFieldData[] = [
	{field: name, label: "Name", cols: 12, lg: 4, type: "text"},
];
const genderFieldLg                    = 4;
const textFields2: FormTextFieldData[] = [
	{field: phone, label: "Phone", cols: 12, lg: 4, type: "text"},
	{field: newPassword, label: "Password", cols: 12, lg: 4, type: "password"},
	{field: reNewPassword, label: "Retype Password", cols: 12, lg: 4, type: "password"},
	{field: latitude, label: "Office address latitude", cols: 12, lg: 6, type: "number"},
	{field: longitude, label: "Office address longitude", cols: 12, lg: 6, type: "number"},
];

async function autofillLatLon () {
	const currentPos = await getCurrentPosition();
	latitude.setValue(currentPos.coords.latitude);
	longitude.setValue(currentPos.coords.longitude);
}

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

function certificateClear (event: unknown) {
	certificate.setValue(null);
	certificateData = null;
}

async function certificateChange (event: Event) {
	certificate.handleChange(event);
	const file = (event.target as HTMLInputElement)?.files?.[0];
	if (file == null) return;
	certificateData = await readFileAsDataUrl(file);
	if (certificateData.length > maxDataUrlLen) {
		await error(`The file must be less than ${maxFileSize} in size.`)
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
	if (certificateData != null && !certificateData.startsWith("data:")) {
		await error("Upload a proper certification file");
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
	let specializationTypes: string[] | Nuly = undefined;
	if (updateCaseSpecializations.value === true) {
		specializationTypes = [];
		const specs         = values.caseSpecializations;
		for (const key of Object.keys(specs)) {
			if (specs[key] === "1") {
				specializationTypes.push(key.substring(2));
			}
		}
	}
	const body: UpdateLawyerProfileInput = {
		authToken,
		name:                values.name,
		newPassword:         nullOrEmptyCoalesce(values.newPassword, undefined),
		photoData:           nullOrEmptyCoalesce(photoData, undefined),
		address:             values.address,
		phone:               values.phone,
		gender:              genderHumanToDB(values.gender),
		certificationData:   nullOrEmptyCoalesce(certificateData, undefined),
		latitude:            +values.latitude,
		longitude:           +values.longitude,
		specializationTypes: specializationTypes,
	}
	console.log(body, values);
	const res                            = await justiceFirmApi.updateLawyerProfile(body);
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error("Failed to set your profile.")
		return;
	}
	userStore.signIn(res.right.body);
	message /*not-awaiting*/("Set your profile successfully");
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

	const profile         = res.right.body as LawyerSearchResult;
	name.value.value      = profile.name;
	phone.value.value     = profile.phone;
	address.value.value   = profile.address;
	photo.value.value     = profile.photoPath;
	gender.value.value    = genderDBToHuman(profile.gender);
	latitude.value.value  = profile.latitude;
	longitude.value.value = profile.longitude;

	for (const csf of caseSpecializationsFields) {
		csf.value.value = null;
	}
	if (profile.caseSpecializations != null && profile.caseSpecializations.length > 0) {
		for (const caseSpec of profile.caseSpecializations) {
			caseSpecializationFieldsById["id" + caseSpec.id].value.value = "1";
		}
	}

	email.value = profile.email;
}, {immediate: true});

onMounted(() => {
	autofillLatLon();
});
</script>

<template>
<v-form @submit.prevent="onSubmit" novalidate>
	<v-card color="gradient--mole-hall">
		<v-card-title>
			<p class="mb-4 text-wrap">
				<span class="text-h2 me-2">Register as a lawyer</span>
				<NuxtLink
					class="text-h6"
					href="/register">Are a client requiring the help of a lawyer? Register as a client now.
				</NuxtLink>
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
					>
					</v-select>
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
						label="Office address"
						rows="3"
						density="compact"
					/>
				</v-col>
				<v-col class="py-0" cols="12" lg="6">
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
				<v-col class="py-0" cols="12" lg="6">
					<v-file-input
						:prepend-icon="null as any"
						prepend-inner-icon="fas fa-certificate"
						:error-messages="certificate.errorMessage.value ?? []"
						@change="certificateChange"
						@blur="certificate.handleBlur"
						label="Certificate"
						density="comfortable"
						@click:clear="certificateClear"
					/>
				</v-col>
				<v-col class="mx-auto" cols="12" md="10">
					<v-expansion-panels>
						<v-expansion-panel
							title="Select case specializations"
							expand-icon="fas fa-chevron-down"
							collapse-icon="fas fa-chevron-up"
							ripple
						>
							<v-expansion-panel-text>
								<v-checkbox
									v-model="updateCaseSpecializations"
									hide-details
									label="Update case specializations"
									density="compact"
									type="checkbox"
								/>
								<v-row no-gutters>
									<v-col
										xl="2"
										lg="3"
										md="4"
										sm="6"
										cols="12"
										v-for="(caseType, i) in caseTypes">
										<v-checkbox
											v-model="caseSpecializationsFields[i].value.value"
											:disabled="!updateCaseSpecializations"
											hide-details
											value="1"
											:label="caseType.name"
											density="compact"
											type="checkbox"
										></v-checkbox>
									</v-col>
								</v-row>
							</v-expansion-panel-text>
						</v-expansion-panel>
					</v-expansion-panels>
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
				<v-btn
					rounded
					variant="elevated"
					density="compact"
					type="button"
					style="float: right;"
					color="pink"
					@click="autofillLatLon">
					Autofill latitude & longitude
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
</template>
