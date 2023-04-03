<script setup lang="ts">
import {definePageMeta, navigateTo} from "#imports";
import {useField, useForm} from 'vee-validate';
import * as yup from "yup";
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

const userStore = useUserStore();

const onSubmit = handleSubmit(async values => {
	if (!validationSchema.isType(values)) {
		alert("Invalid data");
		return;
	}
	// const res = await justiceFirmApi.sendPasswordResetOTP({
	// 	body: {
	// 		email:    values.email,
	// 	},
	// });
	// console.log(res);
	// if (isLeft(res) || !res.right.ok) {
	// 	alert("Failed to send password reset OTP")
	// 	return;
	// }
	alert(`Sent password reset OTP successfully`);
	await navigateTo({
		path:  "/password-reset/set-new-password",
		query: {
			email: email.value.value?.toString(),
		}
	});
});
</script>

<template>
<v-row>
	<v-col cols="12" md="6" class="mx-auto">
		<v-form @submit.prevent="onSubmit" novalidate>
			<v-card color="gradient--lemon-gate">
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
							color="orange-lighten-2">Send OTP
						</v-btn>
					</div>
				</v-card-text>
			</v-card>
		</v-form>
	</v-col>
</v-row>
</template>
