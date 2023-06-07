<script setup lang="ts">
import {computed, justiceFirmApi, navigateTo, ref, useHead, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import {useField, useForm} from 'vee-validate';
import {LocationQueryValue} from "vue-router";
import {useDisplay} from "vuetify";
import * as yup from "yup";
import {StatusEnum, UserAccessType} from "../../common/db-types";
import {LawyerSearchResult} from "../../common/rest-api-schema";
import {closeToZero, firstIfArray, getCurrentPosition, toNumIfNotNull} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import LawyerCard from "../components/details-cards/LawyerCard.vue";
import FormTextFieldInCol from "../components/general/FormTextFieldInCol.vue";
import LawyerPlaceholderCard from "../components/placeholders/LawyerPlaceholderCard.vue";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {withMessageBodyIfApplicable} from "../utils/functions";
import {FormTextFieldData} from "../utils/types";
import {optionalNumber} from "../utils/validation-schemas";

useHead({title: () => "Search lawyers"});

let validationSchema         = yup.object({
	name:      yup.string(),
	address:   yup.string(),
	email:     yup.string(),
	latitude:  optionalNumber(),
	longitude: optionalNumber(),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const name      = useField('name');
const address   = useField('address');
const email     = useField('email');
const latitude  = useField('latitude');
const longitude = useField('longitude');

const {message, error}                    = useModals();
const userStore                           = useUserStore();
const router                              = useRouter();
const route                               = useRoute();
const display                             = useDisplay();
const {smAndDown: moveAutoFillButtonDown} = display;
const isAdmin                             = computed(() => userStore.authToken != null && userStore.authToken.userType === UserAccessType.Admin);

const isLoading = ref<boolean>(false);
const lawyers   = ref<LawyerSearchResult[] | Nuly>();
const showForm  = ref<boolean>(false);

const textFields: FormTextFieldData[] = [
	{field: name, label: "Name", cols: 12, lg: 6, type: "text"},
	{field: email, label: "Email", cols: 12, lg: 6, type: "text"},
];

async function fetchFromQuery () {
	const query: Record<string, LocationQueryValue | LocationQueryValue[]> = route.query;

	const name_      = name.value.value = firstIfArray(query.name);
	const email_     = email.value.value = firstIfArray(query.email);
	const address_   = address.value.value = firstIfArray(query.address);
	const latitude_  = latitude.value.value = (toNumIfNotNull(firstIfArray(query.latitude)) ?? 0);
	const longitude_ = longitude.value.value = (toNumIfNotNull(firstIfArray(query.longitude)) ?? 0);
	if (name_ == null || address_ == null || email_ == null) {
		isLoading.value = false;
		showForm.value  = true;
		return;
	}

	let body        = closeToZero(latitude_) || closeToZero(longitude_) ? {
		name:    name_,
		address: address_,
		email:   email_,
	} : {
		name:      name_,
		address:   address_,
		email:     email_,
		latitude:  latitude_,
		longitude: longitude_,
	};
	isLoading.value = true;
	showForm.value  = false;
	const res       = await justiceFirmApi.searchLawyers(body);
	isLoading.value = false;

	if (isLeft(res) || !res.right.ok || res.right.body == null || "message" in res.right.body) {
		console.log(res);
		await error(withMessageBodyIfApplicable("Failed to search lawyers", res));
		return;
	}

	lawyers.value = res.right.body;
}

async function autofillLatLon () {
	const currentPos = await getCurrentPosition();
	latitude.setValue(currentPos.coords.latitude);
	longitude.setValue(currentPos.coords.longitude);
}

const onSubmit = handleSubmit(async values => {
	const name      = values.name?.toString() ?? "";
	const email     = values.email?.toString() ?? "";
	const address   = values.address?.toString() ?? "";
	const latitude  = values.latitude == null ? 0 : +values.latitude;
	const longitude = values.longitude == null ? 0 : +values.longitude;

	await navigateTo({
		...router.currentRoute.value,
		query: {name, email, address, latitude, longitude}
	});
});

watch(() => route.query, value => {
	fetchFromQuery();
}, {immediate: true});
</script>

<template>
<v-form
	v-if="showForm"
	@submit.prevent="onSubmit">
	<v-card color="gradient--plum-bath" theme="dark" density="compact">
		<v-card-title class="text-wrap">
			<p class="text-h4 mb-4">Find a lawyer</p>
		</v-card-title>
		<v-card-text>
			<v-row>
				<FormTextFieldInCol v-for="field in textFields" :field="field" density="compact" />
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
	v-else
	elevation="3"
	rounded
	density="default"
	variant="tonal"
	color="green-darken-2"
	@click="showForm = true"
>
	<h3>Show search form</h3>
</v-btn>
<div v-if="lawyers != null || isLoading">
	<v-divider class="my-2" />
	<h2>Found lawyers:</h2>
	<div v-if="isLoading">
		<v-row>
			<v-col
				v-for="i of 8"
				cols="12"
				sm="6"
				md="4"
				lg="3">
				<LawyerPlaceholderCard :num-extra-actions="2" />
			</v-col>
		</v-row>
	</div>
	<div v-else-if="lawyers == null || lawyers.length===0">
		<h2>No lawyers found</h2>
	</div>
	<div v-else>
		<v-row>
			<v-col
				v-for="lawyer of lawyers"
				cols="12"
				sm="6"
				md="4"
				lg="3">
				<LawyerCard :lawyer="lawyer" :show-user-id="isAdmin" :num-extra-actions="2">
					<template #actions>
					<v-btn
						:to="`/lawyer-details?id=${lawyer.id}`"
						class=""
						color="cyan-lighten-4"
						density="compact"
						rounded
						variant="tonal">View more details
					</v-btn>
					<v-btn
						v-if="!isAdmin && lawyer.status === StatusEnum.Confirmed"
						:to="`/open-appointment?id=${lawyer.id}`"
						color="cyan-darken-4"
						density="compact"
						rounded
						variant="elevated">Open appointment request
					</v-btn>
					</template>
				</LawyerCard>
			</v-col>
		</v-row>
	</div>
</div>
</template>
