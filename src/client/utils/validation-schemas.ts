import * as yup from "yup";
import {phoneRegex} from "~~/src/common/utils/constants";

function emptyOrMin (s: yup.StringSchema, min: number) {
	return s.test("empty-or-min",
		"Must be have length of 0 or greater than or equal to " + min,
		value => {
			return value == null || value.length === 0 || value.length >= min;
		})
}

function optionalNumberTransform (value: any) {
	return isNaN(value) ? undefined : value;
}

export function optionalNumber () {
	return yup.number().transform(optionalNumberTransform).nullable().optional().notRequired();
}

export function getSignInSchema () {
	return {
		email:    yup
			          .string()
			          .required()
			          .email()
			          .label("E-mail"),
		password: yup
			          .string()
			          .required()
			          .min(8)
			          .label("Password"),
	};
}

export function getRegistrationSchemaForClient (address: string = "Address") {
	return {
		name:       yup
			            .string()
			            .required()
			            .label("Name"),
		email:      yup
			            .string()
			            .required()
			            .email()
			            .label("E-mail"),
		password:   yup
			            .string()
			            .required()
			            .min(8)
			            .label("Password"),
		rePassword: yup
			            .string()
			            .required()
			            .min(8)
			            .oneOf([yup.ref("password")])
			            .label("Retype Password"),
		phone:      yup
			            .string()
			            .required()
			            .matches(phoneRegex)
			            .label("Phone"),
		address:    yup
			            .string()
			            .required()
			            .label(address),
		photo:      yup
			            .mixed()
			            .required()
			            .label("Photo"),
		gender:     yup
			            .string()
			            .required()
			            .label("Gender"),
	};
}

export function getEditProfileSchemaForClient (
	address: string = "Address",
) {
	return {
		name: yup
			      .string()
			      .required()
			      .label("Name"),
		// oldPassword:   yup
		// 	               .string()
		// 	               .required()
		// 	               .min(8)
		// 	               .label("Old Password"),
		newPassword:   emptyOrMin(yup.string(), 8)
			               .label("New Password"),
		reNewPassword: emptyOrMin(yup.string(), 8)
			               .oneOf([yup.ref("newPassword")])
			               .label("Retype New Password"),
		phone:         yup
			               .string()
			               .required()
			               .matches(phoneRegex)
			               .label("Phone"),
		address:       yup
			               .string()
			               .required()
			               .label(address),
		photo:         yup
			               .mixed()
			               .optional()
			               .label("Photo"),
		gender:        yup
			               .string()
			               .required()
			               .label("Gender"),
	};
}

export function getRegistrationSchemaForLawyer () {
	const res = {
		...getRegistrationSchemaForClient("Office address"),
		latitude:    yup
			             .number()
			             .required()
			             .label("Office address latitude"),
		longitude:   yup
			             .number()
			             .required()
			             .label("Office address longitude"),
		certificate: yup
			             .mixed()
			             .required()
			             .label("Certificate"),
	};
	return res;
}

export function getEditProfileSchemaForLawyer () {
	const res = {
		...getEditProfileSchemaForClient("Office address"),
		latitude:    yup
			             .number()
			             .optional()
			             .label("Office address latitude"),
		longitude:   yup
			             .number()
			             .optional()
			             .label("Office address longitude"),
		certificate: yup
			             .mixed()
			             .optional()
			             .label("Certificate"),
	};
	return res;
}
