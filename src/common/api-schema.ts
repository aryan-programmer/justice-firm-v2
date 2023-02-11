import {Static, Type}       from "@sinclair/typebox";
import {endpoint}           from "../singularity/endpoint";
import {lazyCheck, Message} from "../singularity/helpers";
import {HttpMethods}        from "../singularity/httpMethods";
import {modelSchema}        from "../singularity/schema";
import {AuthToken}          from "./api-types";
import {Lawyer}             from "./db-types";
import {maxFileSize}        from "./utils/constants";

export const RegisterLawyerInput = Type.Intersect([
	Type.Omit(Lawyer, ["id", "photoPath", "type", "certificationLink", "status"]),
	Type.Object({
		photoData:         Type.String({
			maxLength: maxFileSize
		}),
		certificationData: Type.String({
			maxLength: maxFileSize
		}),
	})
], {$id: "RegisterLawyerInput"});
export type RegisterLawyerInput = Static<typeof RegisterLawyerInput>;

export const justiceFirmApiSchema = modelSchema({
	name:      "JusticeFirmApi",
	endpoints: {
		registerLawyer: endpoint({
			method:              HttpMethods.POST,
			path:                "/user/lawyer",
			requestBodyChecker:  lazyCheck(RegisterLawyerInput),
			responseBodyChecker: lazyCheck(AuthToken),
		}),
		test:           endpoint({
			method:              HttpMethods.GET,
			path:                "/test",
			responseBodyChecker: lazyCheck(Message)
		})
	}
});
