<script setup lang="ts">
import {useField, useForm} from 'vee-validate';
import * as yup            from "yup";
import {getSignInSchema}   from "~/utils/validationSchemas";

let validationSchema         = yup.object(getSignInSchema());
const {handleSubmit, errors} = useForm({
	validationSchema: validationSchema,
});

const email    = useField('email');
const password = useField('password');

const textFields = [
	{field: email, label: "Email", type: "text"},
	{field: password, label: "Password", type: "password"},
];

const onSubmit = handleSubmit(values => {
	console.log(JSON.stringify(values, null, 2));
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
							color="orange-lighten-2">Sign in
						</v-btn>
					</div>
				</v-card-text>
			</v-card>
		</v-form>
	</v-col>
</v-row>
</template>
