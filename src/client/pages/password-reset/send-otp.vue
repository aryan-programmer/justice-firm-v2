<script setup lang="ts">
import {definePageMeta, justiceFirmApi, navigateTo} from "#imports";
import {isLeft} from "fp-ts/Either";
import isEmpty from "lodash/isEmpty";
import {useField, useForm} from 'vee-validate';
import * as yup from "yup";
import {useModals} from "../../store/modalsStore";
import {useUserStore} from "../../store/userStore";

definePageMeta({
	middleware: "no-user-page"
});

let validationSchema         = yup.object({
	email: yup.string().required().email().label("E-mail")
});
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const email = useField('email');

const {message, error} = useModals();
const userStore        = useUserStore();

const onSubmit = handleSubmit(async values => {
	if (!validationSchema.isType(values)) {
		await error("Invalid data");
		return;
	}
	const res = await justiceFirmApi.sendPasswordResetOTP({
		email: values.email,
	});
	if (isLeft(res) || !res.right.ok) {
		await error("Failed to send password reset OTP")
		return;
	}
	message /*not-awaiting*/(`Sent password reset OTP successfully`);
	await navigateTo({
		path:  "/password-reset/set-new-password",
		query: {
			email: (email.value.value as any)?.toString(),
		}
	});
});
</script>

<template>
<v-row>
	<v-col cols="12" md="6" class="mx-auto">
		<v-form @submit.prevent="onSubmit" novalidate>
			<v-card color="gradient--confident-cloud">
				<v-card-title>
					<p class="text-h4 mb-4">Send password reset OTP</p>
				</v-card-title>
				<v-card-text>
					<v-text-field
						@blur="email.handleBlur"
						v-model="email.value.value"
						:error-messages="email.errorMessage.value"
						label="E-mail"
						density="comfortable"
						type="email"
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
							:disabled="!isEmpty(errors)">Send OTP
						</v-btn>
					</div>
				</v-card-text>
			</v-card>
		</v-form>
	</v-col>
</v-row>
</template>
