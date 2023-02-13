<script setup lang="ts">
import {justiceFirmApi, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {useField, useForm} from 'vee-validate';
import {LocationQueryValue} from "vue-router";
import * as yup from "yup";
import {LawyerSearchResult} from "../../common/api-schema";
import {closeToZero, firstIfArray, getCurrentPosition, toNumIfNotNull} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {ModelResponseOrErr} from "../../singularity/model.client";
import LawyerCard from "../components/LawyerCard.vue";
import {optionalNumber} from "../utils/validation-schemas";

let validationSchema         = yup.object({
	name:      yup.string(),
	address:   yup.string(),
	latitude:  optionalNumber(),
	longitude: optionalNumber(),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name      = useField('name');
const address   = useField('address');
const latitude  = useField('latitude');
const longitude = useField('longitude');

const router = useRouter();
const route  = useRoute();

const lawyers = ref<LawyerSearchResult[] | Nuly>();

async function setFromQuery (query: Record<string, LocationQueryValue | LocationQueryValue[]>) {
	const name_      = name.value.value = firstIfArray(query.name);
	const address_   = address.value.value = firstIfArray(query.address);
	const latitude_  = latitude.value.value = toNumIfNotNull(firstIfArray(query.latitude)) ?? 0;
	const longitude_ = longitude.value.value = toNumIfNotNull(firstIfArray(query.longitude)) ?? 0;
	if (name_ == null || address_ == null) return;

	let body = closeToZero(latitude_) || closeToZero(longitude_) ? {
		name:    name_,
		address: address_,
	} : {
		name:      name_,
		address:   address_,
		latitude:  latitude_,
		longitude: longitude_,
	};
	console.log(body, query);
	const resP: Promise<ModelResponseOrErr<LawyerSearchResult[]>> = justiceFirmApi.searchLawyers({
		body: body
	});

	const res = await resP;
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		console.log(res);
		alert("Failed to search lawyers");
		return;
	}

	lawyers.value = res.right.body;
	console.log(res.right.body);
}

async function autofillLatLon () {
	const currentPos = await getCurrentPosition();
	console.log(currentPos);
	latitude.setValue(currentPos.coords.latitude);
	longitude.setValue(currentPos.coords.longitude);
}

const onSubmit = handleSubmit(async values => {
	const name      = values.name?.toString() ?? "";
	const address   = values.address?.toString() ?? "";
	const latitude  = values.latitude == null ? 0 : +values.latitude;
	const longitude = values.longitude == null ? 0 : +values.longitude;

	await router.push({
		...router.currentRoute.value,
		query: {name, address, latitude, longitude}
	});
});

watch(() => route.query, value => {
	setFromQuery(value);
}, {immediate: true});
</script>

<template>
<v-form @submit.prevent="onSubmit">
	<v-card color="gradient--plum-bath" theme="dark">
		<v-card-title>
			<p class="text-h2 mb-4">Search for a lawyer</p>
		</v-card-title>
		<v-card-text>
			<!--			{{errors}}-->
			<v-text-field
				class="mb-1"
				@blur="name.handleBlur"
				v-model="name.value.value"
				:error-messages="name.errorMessage.value"
				label="Name"
				density="compact"
				type="text"
				hide-details
			/>
			<v-textarea
				class="mb-1"
				@blur="address.handleBlur"
				v-model="address.value.value"
				:error-messages="address.errorMessage.value"
				label="Address"
				rows="3"
				density="compact"
				hide-details
			/>
			<v-row no-gutters>
				<div class="d-flex align-center me-1" style="width: fit-content">
					Sort by distance from
				</div>
				<v-col class="d-flex align-center">
					<v-text-field
						class="me-1"
						@blur="latitude.handleBlur"
						v-model="latitude.value.value"
						:error-messages="latitude.errorMessage.value"
						label="Latitude"
						density="compact"
						type="number"
						hide-details
					/>
				</v-col>
				<v-col class="d-flex align-center">
					<v-text-field
						class="me-1"
						@blur="longitude.handleBlur"
						v-model="longitude.value.value"
						:error-messages="longitude.errorMessage.value"
						label="Longitude"
						density="compact"
						type="number"
						hide-details
					/>
				</v-col>
				<v-col class="d-flex align-center" cols="2" md="1">
					<v-btn
						class="w-100"
						color="green-lighten-3"
						type="button"
						variant="flat"
						density="compact"
						@click="autofillLatLon"
					>Autofill
					</v-btn>
				</v-col>
			</v-row>
			<v-divider class="my-1" />
			<div>
				<v-btn
					rounded
					density="comfortable"
					type="submit"
					variant="elevated"
					value="y"
					color="cyan-lighten-2">Search
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
<div v-if="lawyers != null">
	<v-divider class="my-2" />
	<div v-if="lawyers.length > 0">
		<h2>Found lawyers:</h2>
		<v-row>
			<v-col
				v-for="lawyer of lawyers"
				cols="12"
				sm="6"
				md="4"
				lg="3">
				<LawyerCard :lawyer="lawyer" />
			</v-col>
		</v-row>
	</div>
	<div v-else>
		<h2>No lawyers found</h2>
	</div>
</div>
</template>
