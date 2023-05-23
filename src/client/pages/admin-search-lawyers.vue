<script setup lang="ts">
import {definePageMeta, justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {useField, useForm} from 'vee-validate';
import {LocationQueryValue} from "vue-router";
import {useDisplay} from "vuetify";
import * as yup from "yup";
import {InferType} from "yup";
import {AdminAuthToken} from "../../common/api-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {statusSearchOptionHuman_Any, statusSearchOptionsHumanVals} from "../../common/utils/constants";
import {
	closeToZero,
	firstIfArray,
	getCurrentPosition,
	statusSearchHumanToDB,
	toNumIfNotNull
} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import AdminDashboardForm from "../components/admin-dashboard/AdminDashboardForm.vue";
import FormTextFieldInCol from "../components/general/FormTextFieldInCol.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {FormTextFieldData} from "../utils/types";
import {optionalNumber} from "../utils/validation-schemas";

definePageMeta({
	middleware: "admin-only-page"
});

let validationSchema         = yup.object({
	name:        yup.string(),
	email:       yup.string(),
	humanStatus: yup.string().default(() => statusSearchOptionHuman_Any).oneOf(statusSearchOptionsHumanVals),
	address:     yup.string(),
	latitude:    optionalNumber(),
	longitude:   optionalNumber(),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
	initialValues:    ({
		humanStatus: statusSearchOptionHuman_Any,
		name:        null,
		email:       null,
		address:     null,
		latitude:    null,
		longitude:   null
	}) as unknown as InferType<typeof validationSchema>
});

const name        = useField('name');
const email       = useField('email');
const humanStatus = useField('humanStatus');
const address     = useField('address');
const latitude    = useField('latitude');
const longitude   = useField('longitude');

const {message, error}                    = useModals();
const userStore                           = useUserStore();
const router                              = useRouter();
const route                               = useRoute();
const display                             = useDisplay();
const {smAndDown: moveAutoFillButtonDown} = display;

const lawyers  = ref<LawyerSearchResult[] | Nuly>();
const showForm = ref<boolean>(false);

const textFields: FormTextFieldData[] = [
	{field: name, label: "Name", cols: 12, lg: 5, type: "text"},
	{field: email, label: "Email", cols: 12, lg: 5, type: "text"},
];

async function fetchFromQuery () {
	const query: Record<string, LocationQueryValue | LocationQueryValue[]> = route.query;

	const name_        = name.value.value = firstIfArray(query.name);
	const email_       = email.value.value = firstIfArray(query.email);
	const humanStatus_ = humanStatus.value.value = firstIfArray(query.status) ?? statusSearchOptionHuman_Any;
	const status_      = statusSearchHumanToDB(humanStatus_);
	const address_     = address.value.value = firstIfArray(query.address);
	const latitude_    = latitude.value.value = (toNumIfNotNull(firstIfArray(query.latitude)) ?? 0);
	const longitude_   = longitude.value.value = (toNumIfNotNull(firstIfArray(query.longitude)) ?? 0);
	if (name_ == null || address_ == null || email_ == null) return;

	let body  = closeToZero(latitude_) || closeToZero(longitude_) ? {
		name:    name_,
		address: address_,
		email:   email_,
		status:  status_
	} : {
		name:      name_,
		address:   address_,
		email:     email_,
		status:    status_,
		latitude:  latitude_,
		longitude: longitude_,
	};
	const res = await justiceFirmApi.searchAllLawyers({
		...body,
		authToken: userStore.authToken as AdminAuthToken,
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error("Failed to search lawyers");
		return;
	}

	lawyers.value  = res.right.body;
	showForm.value = false;
}

async function autofillLatLon () {
	const currentPos = await getCurrentPosition();
	latitude.setValue(currentPos.coords.latitude);
	longitude.setValue(currentPos.coords.longitude);
}

const onSubmit = handleSubmit(async values => {
	const name      = values.name?.toString() ?? "";
	const email     = values.email?.toString() ?? "";
	const status    = values.humanStatus?.toString() ?? statusSearchOptionHuman_Any;
	const address   = values.address?.toString() ?? "";
	const latitude  = values.latitude == null ? 0 : +values.latitude;
	const longitude = values.longitude == null ? 0 : +values.longitude;

	await navigateTo({
		...router.currentRoute.value,
		query: {name, email, status, address, latitude, longitude}
	});
});

watch(() => route.query, value => {
	fetchFromQuery();
}, {immediate: true});
</script>

<template>
<v-form
	v-if="lawyers==null||lawyers.length===0||showForm"
	@submit.prevent="onSubmit">
	<v-card color="gradient--sunny-morning" theme="light" density="compact">
		<v-card-title class="text-wrap">
			<p class="text-h4 mb-4">Search all lawyers</p>
		</v-card-title>
		<v-card-text>
			<v-row>
				<FormTextFieldInCol v-for="field in textFields" :field="field" density="compact" />
				<v-col lg="2" cols="12" class="py-0">
					<v-select
						@blur="humanStatus.handleBlur"
						v-model="humanStatus.value.value"
						:error-messages="humanStatus.errorMessage.value ?? []"
						label="Status"
						density="compact"
						:items="statusSearchOptionsHumanVals"
					/>
				</v-col>
			</v-row>
			<v-textarea
				class="mb-1"
				@blur="address.handleBlur"
				v-model="address.value.value"
				:error-messages="address.errorMessage.value ?? []"
				label="Address"
				rows="3"
				density="compact"
				hide-details
			/>
			<v-row no-gutters>
				<div class="d-flex align-center me-1 my-2" style="width: fit-content">
					Sort by distance from
				</div>
				<v-row no-gutters>
					<v-col class="d-flex align-center" :cols="moveAutoFillButtonDown ? '6' : ''">
						<v-text-field
							class="me-1"
							@blur="latitude.handleBlur"
							v-model="latitude.value.value"
							:error-messages="latitude.errorMessage.value ?? []"
							label="Latitude"
							density="compact"
							type="number"
							hide-details
						/>
					</v-col>
					<v-col class="d-flex align-center" :cols="moveAutoFillButtonDown ? '6' : ''">
						<v-text-field
							:class="moveAutoFillButtonDown?'':'me-1'"
							@blur="longitude.handleBlur"
							v-model="longitude.value.value"
							:error-messages="longitude.errorMessage.value ?? []"
							label="Longitude"
							density="compact"
							type="number"
							hide-details
						/>
					</v-col>
					<v-col class="d-flex align-center" :cols="moveAutoFillButtonDown ? '12' : '2'">
						<v-btn
							:class="`w-100 ${moveAutoFillButtonDown?'mt-1':''}`"
							color="green-lighten-3"
							type="button"
							variant="flat"
							density="compact"
							@click="autofillLatLon"
						>Autofill
						</v-btn>
					</v-col>
				</v-row>
			</v-row>
			<v-divider class="my-1" />
			<div>
				<v-btn
					rounded
					density="compact"
					type="submit"
					variant="elevated"
					value="y"
					color="cyan-lighten-2">Search
				</v-btn>
				<v-btn
					v-if="!(lawyers==null||lawyers.length===0)"
					rounded
					density="compact"
					variant="flat"
					color="red-lighten-1"
					class="ms-2"
					@click="showForm = false"
				>
					Hide search form
				</v-btn>
			</div>
		</v-card-text>
	</v-card>
</v-form>
<v-btn
	elevation="3"
	rounded
	density="default"
	variant="tonal"
	color="green-darken-2"
	@click="showForm = true"
	v-else
>
	<h3>Show search form</h3>
</v-btn>
<div v-if="lawyers != null">
	<v-divider class="my-2" />
	<div v-if="lawyers.length > 0">
		<div class="d-flex flex-row flex-wrap justify-space-between">
			<h2 class="d-inline">Found lawyers:</h2>
			<v-tooltip text="Hold SHIFT while scrolling the mouse to scroll horizontally.">
				<template v-slot:activator="{ props }">
				<v-btn
					v-bind="props"
					variant="flat"
					class="ma-1"
					density="compact"
					prepend-icon="fa-info-circle">Horizontal Scroll
				</v-btn>
				</template>
			</v-tooltip>
		</div>
		<AdminDashboardForm
			:lawyers="lawyers"
			@apply-success="fetchFromQuery"
			display-current-status
		/>
	</div>
	<div v-else>
		<h2>No lawyers found</h2>
	</div>
</div>
</template>
