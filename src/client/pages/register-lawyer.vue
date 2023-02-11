<script setup lang="ts">
import {onMounted}                      from "#imports";
import {useField, useForm}              from 'vee-validate';
import * as yup                         from "yup";
import {ISchema}                        from "yup";
import {getRegistrationSchemaForLawyer} from "~/utils/validationSchemas";
import {getCaseTypes}                   from "~~/src/common/utils/constants";
import {getCurrentPosition}             from "~~/src/common/utils/functions";

let caseTypes                           = getCaseTypes();
let caseSpecializationsValidationSchema = yup.object(caseTypes.reduce((previousValue, currentValue) => {
	previousValue["id" + currentValue.id] = yup.string();
	return previousValue;
}, {} as Record<string, ISchema<any>>));

let validationSchema         = yup.object({
	...getRegistrationSchemaForLawyer(),
	caseSpecializations: caseSpecializationsValidationSchema,
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name        = useField('name');
const email       = useField('email');
const password    = useField('password');
const rePassword  = useField('rePassword');
const phone       = useField('phone');
const address     = useField('address');
const photo       = useField('photo');
const certificate = useField('certificate');
const latitude    = useField('latitude');
const longitude   = useField('longitude');

const caseSpecializationsFields = caseTypes.map((value, i) => useField(`caseSpecializations.id${i}`));

const textFields = [
	{field: name, label: "Name", cols: 12, lg: 4, type: "text"},
	{field: email, label: "Email", cols: 12, lg: 4, type: "text"},
	{field: phone, label: "Phone", cols: 12, lg: 4, type: "text"},
	{field: password, label: "Password", cols: 12, lg: 6, type: "password"},
	{field: rePassword, label: "Retype Password", cols: 12, lg: 6, type: "password"},
	{field: latitude, label: "Office address latitude", cols: 12, lg: 6, type: "number"},
	{field: longitude, label: "Office address longitude", cols: 12, lg: 6, type: "number"},
];

async function autofillLatLon () {
	const currentPos = await getCurrentPosition();
	console.log(currentPos);
	latitude.setValue(currentPos.coords.latitude);
	longitude.setValue(currentPos.coords.longitude);
}

function photoClear (event: unknown) {
	photo.setValue(null);
}

function photoChange (event: Event) {
	console.log(event, 112);
	photo.handleChange(event);
	const files      = (event.target as HTMLInputElement)?.files!;
	let filename     = files[0].name;
	const fileReader = new FileReader();
	fileReader.addEventListener('load', () => {
		const res = fileReader.result;
		//console.log(filename, res, typeof res);
	});
	fileReader.readAsDataURL(files[0]);
}

function certificateClear (event: unknown) {
	certificate.setValue(null);
}

function certificateChange (event: Event) {
	certificate.handleChange(event);
	const files      = (event.target as HTMLInputElement)?.files!;
	let filename     = files[0].name;
	const fileReader = new FileReader()
	fileReader.addEventListener('load', () => {
		const res = fileReader.result;
		//console.log(filename, res, typeof res);
	});
	fileReader.readAsDataURL(files[0]);
}

const onSubmit = handleSubmit(values => {
	console.log(JSON.stringify(values, null, 2));
});

onMounted(() => {
	autofillLatLon();
});
</script>

<template>
<v-form @submit.prevent="onSubmit" novalidate>
	<v-card color="gradient--kind-steel">
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
						label="Office address"
						rows="3"
						density="compact"
					/>
				</v-col>
				<v-col class="py-0" cols="12" lg="6">
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
				<v-col class="py-0" cols="12" lg="6">
					<v-file-input
						:prepend-icon="null"
						prepend-inner-icon="fas fa-certificate"
						:error-messages="certificate.errorMessage.value"
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
						>
							<v-expansion-panel-text>
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
											hide-details
											value="1"
											:label="caseType.type"
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
					color="orange-lighten-2">Register
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