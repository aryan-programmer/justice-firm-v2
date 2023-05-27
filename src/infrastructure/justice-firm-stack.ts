import {WebSocketApi, WebSocketStage} from "@aws-cdk/aws-apigatewayv2-alpha";
import {WebSocketRouteOptions} from "@aws-cdk/aws-apigatewayv2-alpha/lib/websocket/route";
import {WebSocketLambdaIntegration} from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
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
import {Effect, PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {Code, Function, FunctionProps, Runtime} from "aws-cdk-lib/aws-lambda";
import {Bucket, BucketAccessControl, BucketEncryption, HttpMethods} from "aws-cdk-lib/aws-s3";
import {IStringParameter} from "aws-cdk-lib/aws-ssm";
import {Construct} from 'constructs';
import mapValues from "lodash/mapValues";
import 'reflect-metadata';
import {
	CONNECTION_ID,
	CONNECTION_KEY_ID,
	CONNECTION_TYPE,
	connectionsByKeyIdIndex,
	MESSAGE_GROUP,
	MESSAGE_TIMESTAMP
} from "../common/infrastructure-constants";
import {justiceFirmApiSchema} from "../common/rest-api-schema";
import {jfChatterBoxApiSchema} from "../common/ws-chatter-box-api-schema";
import {jfNotificationsApiSchema} from "../common/ws-notifications-api-schema";
import {EndpointSchema} from "../singularity/endpoint";
import {ApiGatewayResourceMap} from "./api-gateway-resource-map";
import {LambdaIntegrationNoPermission} from "./LambdaFunctionNoPermissions";

const path = require("path");

const chatterBoxCallbackUrlParamName    = "/justice-firm/ws-chatter-box-api/callback-url";
const notificationsCallbackUrlParamName = "/justice-firm/ws-notifications-api/callback-url";

export class JusticeFirmStack extends Stack {
	private readonly apiName: string;

	private lambda: Function;
	private s3Bucket: Bucket;
	private passwordResetOtpTable: aws_dynamodb.Table;
	private connectionsTable: aws_dynamodb.Table;
	private messagesTable: aws_dynamodb.Table;
	private api: RestApi;
	private wsApi: WebSocketApi;
	private dbEndpoint: string;
	private dbPort: string;
	private dbUsername: string;
	private dbPassword: IStringParameter;
	private jwtSecret: IStringParameter;
	private redisEndpoint: string;
	private redisPort: string;
	private redisUsername: string;
	private redisPassword: IStringParameter;
	private wsApiStage: WebSocketStage;
	private wsChatterBoxApiCallbackUrlParam: IStringParameter;
	private wsNotificationsApiCallbackUrlParam: IStringParameter;

	constructor (scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.apiName = justiceFirmApiSchema.name;
		this.makeDataBucket();
		this.makeMessagesTable();
		this.makeConnectionsTable();
		this.makePasswordResetOtpTable();
		this.getConstsAndSecrets();
		this.makeLambdaFunction();
		this.makeRestApi();
		this.makeWebSocketApi();
		this.grantIamPolicies();
	}

	private makeDataBucket () {
		this.s3Bucket = new Bucket(this, `${this.apiName}-DataBucket`, {
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
			value: this.s3Bucket.bucketArn,
		});
	}

	private makeMessagesTable () {
		this.messagesTable = new aws_dynamodb.Table(this, "MessagesTable", {
			partitionKey:  {
				name: MESSAGE_GROUP,
				type: AttributeType.STRING
			},
			sortKey:       {
				name: MESSAGE_TIMESTAMP,
				type: AttributeType.STRING
			},
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode:   BillingMode.PROVISIONED,
			readCapacity:  4,
			writeCapacity: 4,
		});

		new CfnOutput(this, "MessagesTableArn", {
			value: this.messagesTable.tableArn,
		});
	}

	private makeConnectionsTable () {
		this.connectionsTable = new aws_dynamodb.Table(this, "ConnectionsTable", {
			partitionKey:  {
				name: CONNECTION_ID,
				type: AttributeType.STRING
			},
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode:   BillingMode.PROVISIONED,
			readCapacity:  3,
			writeCapacity: 3,
		});
		this.connectionsTable.addGlobalSecondaryIndex({
			indexName:     connectionsByKeyIdIndex,
			partitionKey:  {
				name: CONNECTION_KEY_ID,
				type: AttributeType.STRING
			},
			sortKey:       {
				name: CONNECTION_TYPE,
				type: AttributeType.STRING
			},
			readCapacity:  3,
			writeCapacity: 3,
		});

		new CfnOutput(this, "ConnectionsTableArn", {
			value: this.connectionsTable.tableArn,
		});
	}

	private makePasswordResetOtpTable () {
		this.passwordResetOtpTable = new aws_dynamodb.Table(this, "PasswordResetOTPTable", {
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
			value: this.passwordResetOtpTable.tableArn,
		});
	}

	private getConstsAndSecrets () {
		this.dbEndpoint = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/endpoint");
		this.dbPort     = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/port");
		this.dbUsername = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/username");
		this.dbPassword = ssm.StringParameter.fromSecureStringParameterAttributes(
			this,
			`${this.apiName}-DbPassword`,
			{parameterName: "/justice-firm/db/password"}
		);

		this.jwtSecret = ssm.StringParameter.fromSecureStringParameterAttributes(
			this,
			`${this.apiName}-JWTSecret`,
			{parameterName: "/justice-firm/jwt/secret"}
		);

		this.redisEndpoint = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/redis-cache/endpoint");
		this.redisPort     = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/redis-cache/port");
		this.redisUsername = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/redis-cache/username");
		this.redisPassword = ssm.StringParameter.fromSecureStringParameterAttributes(
			this,
			`${this.apiName}-RedisPassword`,
			{parameterName: "/justice-firm/redis-cache/password"}
		);
	}

	private makeLambdaFunction () {
		const props: FunctionProps = {
			runtime:     Runtime.NODEJS_18_X,
			handler:     `app.handler`,
			code:        Code.fromAsset(path.resolve(__dirname, "../server/dist")),
			timeout:     Duration.minutes(1),
			environment: {
				DB_ENDPOINT:                                  this.dbEndpoint,
				DB_PORT:                                      this.dbPort,
				DB_USERNAME:                                  this.dbUsername,
				DB_PASSWORD:                                  this.dbPassword.parameterName,
				REDIS_ENDPOINT:                               this.redisEndpoint,
				REDIS_PORT:                                   this.redisPort,
				REDIS_USERNAME:                               this.redisUsername,
				REDIS_PASSWORD:                               this.redisPassword.parameterName,
				S3_BUCKET:                                    this.s3Bucket.bucketName,
				JWT_SECRET:                                   this.jwtSecret.parameterName,
				PASSWORD_RESET_OTP_TABLE_NAME:                this.passwordResetOtpTable.tableName,
				CONNECTIONS_TABLE_NAME:                       this.connectionsTable.tableName,
				MESSAGES_TABLE_NAME:                          this.messagesTable.tableName,
				WS_CHATTER_BOX_API_CALLBACK_URL_PARAM_NAME:   chatterBoxCallbackUrlParamName,
				WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME: notificationsCallbackUrlParamName,
				SES_SOURCE_EMAIL_ADDRESS:                     "justice.firm.norepley@gmail.com",
				NODE_OPTIONS:                                 "--enable-source-maps --stack_trace_limit=200",
			},
			memorySize:  1024,
		};
		this.lambda                = new Function(this, `${this.apiName}-FunnelFunction`, props);
	}

	private makeRestApi () {
		this.api = new RestApi(this, this.apiName, {
			deploy:                      true,
			defaultCorsPreflightOptions: {
				allowOrigins: apiGateway.Cors.ALL_ORIGINS,
				allowMethods: apiGateway.Cors.ALL_METHODS,
				allowHeaders: ["*"]
			},
		});

		const lambdaIntegration = new LambdaIntegrationNoPermission(this.lambda, {proxy: true});
		const resourceMap       = new ApiGatewayResourceMap(this.api.root);

		mapValues(justiceFirmApiSchema.endpoints, <TReq, TRes> (value: EndpointSchema<TReq, TRes>) => {
			resourceMap.getFromPath(value.path).addMethod(value.method, lambdaIntegration);
		});

		// See: https://github.com/aws/aws-cdk/issues/9327#issuecomment-858372987
		this.lambda.addPermission(`${this.apiName}-APIGWPermissions`, {
			action:    'lambda:InvokeFunction',
			principal: new ServicePrincipal('apigateway.amazonaws.com'),
			sourceArn: this.api.arnForExecuteApi()
		});
	}

	private makeWebSocketApi () {
		const wsApiName = jfChatterBoxApiSchema.name;
		const lambda    = this.lambda;

		function getRouteOptions (): WebSocketRouteOptions {
			return {
				integration:    new WebSocketLambdaIntegration(`${wsApiName}-LambdaIntegration`, lambda),
				returnResponse: true,
			};
		}

		this.wsApi      = new WebSocketApi(this, wsApiName, {
			apiName:                wsApiName,
			connectRouteOptions:    getRouteOptions(),
			disconnectRouteOptions: getRouteOptions(),
		});
		this.wsApiStage = new WebSocketStage(this, `${wsApiName}-ProdStage`, {
			webSocketApi: this.wsApi,
			stageName:    'prod',
			autoDeploy:   true,
		});

		mapValues(jfChatterBoxApiSchema.endpoints, <TReq, TRes> (value: EndpointSchema<TReq, TRes>) => {
			if (value.path === "$connect" || value.path === "$disconnect") return;
			this.wsApi.addRoute(value.path, getRouteOptions());
		});

		this.wsChatterBoxApiCallbackUrlParam    = new ssm.StringParameter(this, `${wsApiName}-CallbackUrlParam`, {
			stringValue:   this.wsApiStage.callbackUrl,
			parameterName: chatterBoxCallbackUrlParamName
		});
		this.wsNotificationsApiCallbackUrlParam = new ssm.StringParameter(this,
			`${jfNotificationsApiSchema.name}-CallbackUrlParam`,
			{
				stringValue:   this.wsApiStage.callbackUrl,
				parameterName: notificationsCallbackUrlParamName
			});
	}

	private grantIamPolicies () {
		this.wsNotificationsApiCallbackUrlParam.grantRead(this.lambda);
		this.wsChatterBoxApiCallbackUrlParam.grantRead(this.lambda);
		this.dbPassword.grantRead(this.lambda);
		this.redisPassword.grantRead(this.lambda);
		this.jwtSecret.grantRead(this.lambda);
		this.s3Bucket.grantDelete(this.lambda);
		this.s3Bucket.grantPut(this.lambda);
		this.s3Bucket.grantPutAcl(this.lambda);
		this.s3Bucket.grantReadWrite(this.lambda);
		this.messagesTable.grantReadWriteData(this.lambda);
		this.passwordResetOtpTable.grantReadWriteData(this.lambda);
		this.connectionsTable.grantReadWriteData(this.lambda);
		this.wsApi.grantManageConnections(this.lambda);
		this.addSesPolicy();
	}

	private addSesPolicy () {
		this.lambda.addToRolePolicy(
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
	}
}
