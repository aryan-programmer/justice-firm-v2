import {IntegrationConfig, LambdaIntegration, LambdaIntegrationOptions, Method} from "aws-cdk-lib/aws-apigateway";
import {CfnPermission, IFunction} from "aws-cdk-lib/aws-lambda";

/*
 Required to fix error:
 JusticeFirmStack failed: Error: The stack named JusticeFirmStack failed to deploy:
 UPDATE_ROLLBACK_COMPLETE: The final policy size (vwxyz) is bigger than the limit (20480).
 (Service: AWSLambdaInternal; Status Code: 400; Error Code: PolicyLengthExceededException;
 Request ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa; Proxy: null)
 See: https://github.com/aws/aws-cdk/issues/9327#issuecomment-858372987
* */
export class LambdaIntegrationNoPermission extends LambdaIntegration {
	constructor (handler: IFunction, options?: LambdaIntegrationOptions) {
		super(handler, options);
	}

	bind (method: Method): IntegrationConfig {
		const integrationConfig = super.bind(method);
		const permissions       = method.node.children.filter(c => c instanceof CfnPermission);
		permissions.forEach(p => method.node.tryRemoveChild(p.node.id));
		return integrationConfig;
	}
}
