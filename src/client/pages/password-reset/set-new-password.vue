<script setup lang="ts">
import {definePageMeta, justiceFirmApi, navigateTo, ref, useRoute, useRouter, watch} from "#imports";
import {isLeft} from "fp-ts/Either";
import isEmpty from "lodash/isEmpty";
import {useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {AuthToken} from "../../../common/api-types";
import {otpLength, validOtpRegex} from "../../../common/utils/constants";
import {Nuly} from "../../../common/utils/types";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";

definePageMeta({
	middleware: "no-user-page"
});

let validationSchema         = yup.object({
	otp:        yup.string().required().matches(validOtpRegex).min(otpLength).max(otpLength).label("OTP"),
	password:   yup.string().required().min(8).label("Password"),
	rePassword: yup
		            .string()
		            .required()
		            .min(8)
		            .oneOf([yup.ref("password")])
		            .label("Retype Password"),
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const email      = ref<string | Nuly>(null);
const otp        = useField('otp');
const password   = useField('password');
const rePassword = useField('rePassword');

const {message, error} = useModals();
const route            = useRoute();
const router           = useRouter();
const userStore        = useUserStore();

const textFields = [
	{field: otp, label: "OTP", type: "password"},
	{field: password, label: "Password", type: "password"},
	{field: rePassword, label: "Retype Password", type: "password"},
];

const onSubmit = handleSubmit(async values => {
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	if (email.value == null) return;
	const res = await justiceFirmApi.resetPassword({
		email:    email.value,
		password: values.password,
		otp:      values.otp,
	});
	if (isLeft(res) || res.right.body == null) {
		console.log(res);
		await error("Failed to set a new password");
		return;
	}
	if ("message" in res.right.body) {
		await error("Failed to set a new password: " + res.right.body.message);
		return;
	}
	const authToken: AuthToken = res.right.body;
	message /*not-awaiting*/(`Set a new password successfully`);
	userStore.signIn(authToken);
	await navigateTo("/");
});

watch(() => route.query.email, async value => {
	const emailQuery = value?.toString();
	if (emailQuery == null || emailQuery.length === 0) {
		await error("Invalid E-mail ID");
		await navigateTo("/");
		return;
	}

	email.value = emailQuery;
}, {immediate: true});
</script>

<template>
<v-row>
	<v-col cols="12" md="6" class="mx-auto">
		<v-form @submit.prevent="onSubmit" novalidate>
			<v-card color="gradient--morning-salad">
				<v-card-title>
					<p class="text-h2 mb-4">Reset Password</p>
				</v-card-title>
				<v-card-text>
					<v-text-field
						:model-value="email"
						label="E-mail"
						density="comfortable"
						type="email"
						readonly
					/>
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
							:disabled="!isEmpty(errors)">Confirm new password
						</v-btn>
					</div>
				</v-card-text>
			</v-card>
		</v-form>
	</v-col>
</v-row>
</template>
