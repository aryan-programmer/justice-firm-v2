import {
	aws_apigateway as apiGateway,
	aws_dynamodb,
	aws_ssm as ssm,
	CfnOutput,
	Duration,
	RemovalPolicy,
	Stack,
	StackProps
} from "aws-cdk-lib";
import {RestApi} from "aws-cdk-lib/aws-apigateway";
import {AttributeType, BillingMode} from "aws-cdk-lib/aws-dynamodb";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Code, Function, FunctionProps, Runtime} from "aws-cdk-lib/aws-lambda";
import {Bucket, BucketAccessControl, BucketEncryption, HttpMethods} from "aws-cdk-lib/aws-s3";
import {Construct} from 'constructs';
import {mapValues} from "lodash";
import 'reflect-metadata';
import {justiceFirmApiSchema} from "../common/api-schema";
import {pathSchemaToString} from "../singularity/helpers";
import {ApiGatewayResourceMap} from "./api-gateway-resource-map";

const path = require("path");

type EndpointNames = keyof typeof justiceFirmApiSchema.endpoints;
type FunctionPropsMergeable = Partial<FunctionProps>;

export class JusticeFirmStack extends Stack {
	constructor (scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const apiName = justiceFirmApiSchema.name;

		const api = new RestApi(this, apiName, {
			deploy: true,
		});

		const s3Bucket = new Bucket(this, `${apiName}-DataBucket`, {
			removalPolicy:    RemovalPolicy.RETAIN,
			encryption:       BucketEncryption.S3_MANAGED,
			accessControl:    BucketAccessControl.PUBLIC_READ,
			publicReadAccess: true,
			cors:             [{
				allowedOrigins: ["*"],
				allowedMethods: [HttpMethods.GET],
			}],
		});

		new CfnOutput(this, "S3BucketArn", {
			value: s3Bucket.bucketArn,
		});

		const passwordResetOtpTable = new aws_dynamodb.Table(this, "PasswordResetOTPTable", {
			partitionKey:  {
				name: "email",
				type: AttributeType.STRING
			},
			sortKey:       {
				name: "otp",
				type: AttributeType.STRING
			},
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode:   BillingMode.PROVISIONED,
			readCapacity:  1,
			writeCapacity: 1,
		});

		new CfnOutput(this, "PasswordResetOTPTableArn", {
			value: passwordResetOtpTable.tableArn,
		});

		const functionCommonProps: FunctionPropsMergeable = {
			environment: {}
		};

		const dbEndpoint = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/endpoint");
		const dbPort     = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/port");
		const dbUsername = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/username");
		const dbPassword = ssm.StringParameter.fromSecureStringParameterAttributes(
			this,
			`${apiName}-DbPassword`,
			{parameterName: "/justice-firm/db/password"}
		);
		const jwtSecret  = ssm.StringParameter.fromSecureStringParameterAttributes(
			this,
			`${apiName}-JWTSecret`,
			{parameterName: "/justice-firm/jwt/secret"}
		);

		const lambda = new Function(this, `${apiName}-FunnelFunction`, {
			...functionCommonProps,
			runtime:     Runtime.NODEJS_18_X,
			handler:     `app.handler`,
			code:        Code.fromAsset(path.resolve(__dirname, "../server/dist")),
			environment: {
				DB_ENDPOINT:                   dbEndpoint,
				DB_PORT:                       dbPort,
				DB_USERNAME:                   dbUsername,
				DB_PASSWORD:                   dbPassword.parameterName,
				S3_BUCKET:                     s3Bucket.bucketName,
				JWT_SECRET:                    jwtSecret.parameterName,
				PASSWORD_RESET_OTP_TABLE_NAME: passwordResetOtpTable.tableName,
				SES_SOURCE_EMAIL_ADDRESS:      "justice.firm.norepley@gmail.com",
				NODE_OPTIONS:                  "--enable-source-maps --stack_trace_limit=200",
			},
			timeout:     Duration.minutes(1),
			memorySize:  1024,
		});
		dbPassword.grantRead(lambda);
		jwtSecret.grantRead(lambda);
		s3Bucket.grantDelete(lambda);
		s3Bucket.grantPut(lambda);
		s3Bucket.grantPutAcl(lambda);
		s3Bucket.grantReadWrite(lambda);
		passwordResetOtpTable.grantReadWriteData(lambda);
		lambda.addToRolePolicy(
			new PolicyStatement({
				effect:    Effect.ALLOW,
				actions:   [
					'ses:SendEmail',
					'ses:SendRawEmail',
					'ses:SendTemplatedEmail',
				],
				resources: [
					"*"
				],
			}),
		);

		const lambdaIntegration = new apiGateway.LambdaIntegration(lambda);
		const resourceMap       = new ApiGatewayResourceMap(api.root);

		mapValues(justiceFirmApiSchema.endpoints, (value, _key) => {
			const apiPath  = pathSchemaToString(value.path);
			const resource = resourceMap.getFromPath(apiPath);
			resource.addMethod(value.method, lambdaIntegration);
		});
	}
}
