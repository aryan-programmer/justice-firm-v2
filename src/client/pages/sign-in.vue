<script setup lang="ts">
import {definePageMeta, navigateTo} from "#imports";
import {isLeft} from "fp-ts/Either";
import isEmpty from "lodash/isEmpty";
import {useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {AuthToken} from "../../common/api-types";
import {useModals} from "../store/modalsStore";
import {useUserStore} from "../store/userStore";
import {justiceFirmApi} from "../utils/api-fetcher-impl";
import {getSignInSchema} from "../utils/validation-schemas";

definePageMeta({
	middleware: "no-user-page"
});

let validationSchema         = yup.object(getSignInSchema());
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const email    = useField('email');
const password = useField('password');

const {message, error} = useModals();
const userStore        = useUserStore();

const textFields = [
	{field: email, label: "Email", type: "email"},
	{field: password, label: "Password", type: "password"},
];

const onSubmit = handleSubmit(async values => {
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	const res = await justiceFirmApi.sessionLogin({
		email:    values.email,
		password: values.password,
	});
	if (isLeft(res) || !res.right.ok || res.right.body == null) {
		await error("Failed to sign in")
		return;
	}
	if ("message" in res.right.body) {
		await error("Failed to sign in: " + res.right.body.message)
		return;
	}
	const authToken: AuthToken = res.right.body;
	await message(`Signed in as a ${authToken.userType} successfully`);
	userStore.signIn(authToken);
	await navigateTo("/");
});
</script>

<template>
<v-row>
	<v-col cols="12" md="6" class="mx-auto">
		<v-form @submit.prevent="onSubmit" novalidate>
			<v-card color="gradient--lemon-gate">
				<v-card-title>
					<p class="text-h2 mb-4">Sign in</p>
				</v-card-title>
				<v-card-text>
					<v-text-field
						v-for="field in textFields"
						@blur="field.field.handleBlur"
						v-model="field.field.value.value"
						:error-messages="field.field.errorMessage.value"
						:label="field.label"
						density="comfortable"
						:type="field.type"
					/>
					<v-divider class="my-3" />
					<div>
						<v-btn
							rounded
							type="submit"
							name="submit"
							variant="elevated"
							value="y"
							color="orange-lighten-2"
							:disabled="!isEmpty(errors)">Sign in
						</v-btn>
						<NuxtLink
							class="d-block"
							href="/password-reset/send-otp">Forgot your password? Reset it here.
						</NuxtLink>
					</div>
				</v-card-text>
			</v-card>
		</v-form>
	</v-col>
</v-row>
</template>
