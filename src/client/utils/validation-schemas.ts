import * as yup from "yup";
import {phoneRegex} from "~~/src/common/utils/constants";

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
	//const address = forLawyer ? "Office address" : "Address";
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
