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
import {Code, Function, FunctionProps, IFunction, Runtime} from "aws-cdk-lib/aws-lambda";
import {Bucket, BucketAccessControl, BucketEncryption, HttpMethods} from "aws-cdk-lib/aws-s3";
import {Topic} from "aws-cdk-lib/aws-sns";
import {LambdaSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {IStringParameter} from "aws-cdk-lib/aws-ssm";
import {Construct} from 'constructs';
import mapValues from "lodash/mapValues";
import 'reflect-metadata';
import {
	CONNECTION_GROUP_ID,
	CONNECTION_ID,
	connectionsByGroupIdIndex,
	MESSAGE_GROUP,
	MESSAGE_TIMESTAMP,
	SETTINGS_GROUP
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

	private apiFunnelLambda: Function;
	private eventAndNotifsLambda: Function;
	private s3Bucket: Bucket;
	private passwordResetOtpTable: aws_dynamodb.Table;
	private settingsTable: aws_dynamodb.Table;
	private connectionsTable: aws_dynamodb.Table;
	private messagesTable: aws_dynamodb.Table;
	private api: RestApi;
	private jfChatterBoxWsApi: WebSocketApi;
	private jfChatterBoxWsApiStage: WebSocketStage;
	private jfNotificationsWsApi: WebSocketApi;
	private jfNotificationsWsApiStage: WebSocketStage;
	private dbEndpoint: string;
	private dbPort: string;
	private dbUsername: string;
	private dbDatabaseName: string;
	private dbPassword: IStringParameter;
	private jwtSecret: IStringParameter;
	private redisEndpoint: string;
	private redisPort: string;
	private redisUsername: string;
	private redisPassword: IStringParameter;
	private wsChatterBoxApiCallbackUrlParam: IStringParameter;
	private wsNotificationsApiCallbackUrlParam: IStringParameter;
	private eventsSnsTopic: Topic;

	constructor (scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.apiName = justiceFirmApiSchema.name;
		this.makeDataBucket();
		this.makeSettingsTable();
		this.makeMessagesTable();
		this.makeConnectionsTable();
		this.makePasswordResetOtpTable();
		this.makeEventsSnsTopic();
		this.getConstsAndSecrets();
		this.makeLambdaFunctions();
		this.makeRestApi();
		this.makeChatterBoxWebSocketApi();
		this.makeNotificationsWebSocketApi();
		this.addEventsSnsTopicSubscriptions();
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

	private makeSettingsTable () {
		this.settingsTable = new aws_dynamodb.Table(this, "SettingsTable", {
			partitionKey:  {
				name: SETTINGS_GROUP,
				type: AttributeType.STRING
			},
			removalPolicy: RemovalPolicy.DESTROY,
			billingMode:   BillingMode.PROVISIONED,
			readCapacity:  4,
			writeCapacity: 4,
		});

		new CfnOutput(this, "SettingsTableArn", {
			value: this.settingsTable.tableArn,
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
			readCapacity:  5,
			writeCapacity: 5,
		});
		this.connectionsTable.addGlobalSecondaryIndex({
			indexName:    connectionsByGroupIdIndex,
			partitionKey: {
				name: CONNECTION_GROUP_ID,
				type: AttributeType.STRING
			},
			// sortKey:       {
			// 	name: CONNECTION_TYPE,
			// 	type: AttributeType.STRING
			// },
			readCapacity:  5,
			writeCapacity: 5,
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

	private makeEventsSnsTopic () {
		const snsTopicId    = `${this.apiName}-EventsSNSTopic`;
		this.eventsSnsTopic = new Topic(this, snsTopicId, {
			displayName: snsTopicId,
		});
	}

	private getConstsAndSecrets () {
		this.dbEndpoint     = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/endpoint");
		this.dbPort         = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/port");
		this.dbUsername     = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/username");
		this.dbDatabaseName = ssm.StringParameter.valueForStringParameter(this, "/justice-firm/db/database-name");
		this.dbPassword     = ssm.StringParameter.fromSecureStringParameterAttributes(
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

	private makeLambdaFunctions () {
		const commonEnvironment = {
			REDIS_ENDPOINT:         this.redisEndpoint,
			REDIS_PORT:             this.redisPort,
			REDIS_USERNAME:         this.redisUsername,
			REDIS_PASSWORD:         this.redisPassword.parameterName,
			S3_BUCKET:              this.s3Bucket.bucketName,
			JWT_SECRET:             this.jwtSecret.parameterName,
			CONNECTIONS_TABLE_NAME: this.connectionsTable.tableName,
			MESSAGES_TABLE_NAME:    this.messagesTable.tableName,
			EVENTS_SNS_TOPIC_ARN:   this.eventsSnsTopic.topicArn,
			NODE_OPTIONS:           "--enable-source-maps --stack_trace_limit=200",
		};

		const eventListenerLambdaProps: FunctionProps = {
			runtime: Runtime.NODEJS_18_X,
			handler: `app.handler`,
			// architecture: Architecture.ARM_64,
			code:        Code.fromAsset(path.resolve(__dirname, "../server/dist/events-and-notifications-apis")),
			timeout:     Duration.minutes(1),
			environment: {
				...commonEnvironment,
				WS_NOTIFICATIONS_API_CALLBACK_URL_PARAM_NAME: notificationsCallbackUrlParamName,
				SETTINGS_TABLE_NAME:                          this.settingsTable.tableName,
			},
			memorySize:  1024,
		};

		const funnelLambdaProps: FunctionProps = {
			runtime: Runtime.NODEJS_18_X,
			handler: `app.handler`,
			// architecture: Architecture.ARM_64,
			code:        Code.fromAsset(path.resolve(__dirname, "../server/dist/rest-ws-apis")),
			timeout:     Duration.minutes(1),
			environment: {
				...commonEnvironment,
				DB_ENDPOINT:                                this.dbEndpoint,
				DB_PORT:                                    this.dbPort,
				DB_USERNAME:                                this.dbUsername,
				DB_DATABASE_NAME:                           this.dbDatabaseName,
				DB_PASSWORD:                                this.dbPassword.parameterName,
				SES_SOURCE_EMAIL_ADDRESS:                   "justice.firm.norepley@gmail.com",
				PASSWORD_RESET_OTP_TABLE_NAME:              this.passwordResetOtpTable.tableName,
				WS_CHATTER_BOX_API_CALLBACK_URL_PARAM_NAME: chatterBoxCallbackUrlParamName,
			},
			memorySize:  1024,
		};

		this.eventAndNotifsLambda = new Function(this,
			`${this.apiName}-EventAndNotificationsFunction`,
			eventListenerLambdaProps);
		this.apiFunnelLambda      = new Function(this, `${this.apiName}-FunnelFunction`, funnelLambdaProps);
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

		const lambdaIntegration = new LambdaIntegrationNoPermission(this.apiFunnelLambda, {proxy: true});
		const resourceMap       = new ApiGatewayResourceMap(this.api.root);

		mapValues(justiceFirmApiSchema.endpoints, <TReq, TRes> (value: EndpointSchema<TReq, TRes>) => {
			resourceMap.getFromPath(value.path).addMethod(value.method, lambdaIntegration);
		});

		// See: https://github.com/aws/aws-cdk/issues/9327#issuecomment-858372987
		this.apiFunnelLambda.addPermission(`${this.apiName}-APIGWPermissions`, {
			action:    'lambda:InvokeFunction',
			principal: new ServicePrincipal('apigateway.amazonaws.com'),
			sourceArn: this.api.arnForExecuteApi()
		});
	}

	private makeChatterBoxWebSocketApi () {
		const wsChatterBoxApiName = jfChatterBoxApiSchema.name;

		function getRouteOptions (routeName: string, lambda: IFunction): WebSocketRouteOptions {
			return {
				integration:    new WebSocketLambdaIntegration(`${wsChatterBoxApiName}-${routeName}-LambdaIntegration`,
					lambda),
				returnResponse: true,
			};
		}

		this.jfChatterBoxWsApi      = new WebSocketApi(this, wsChatterBoxApiName, {
			apiName:                wsChatterBoxApiName,
			connectRouteOptions:    getRouteOptions("$connect", this.apiFunnelLambda),
			disconnectRouteOptions: getRouteOptions("$disconnect", this.apiFunnelLambda),
		});
		this.jfChatterBoxWsApiStage = new WebSocketStage(this, `${wsChatterBoxApiName}-ProdStage`, {
			webSocketApi: this.jfChatterBoxWsApi,
			stageName:    'prod',
			autoDeploy:   true,
		});

		mapValues(jfChatterBoxApiSchema.endpoints, <TReq, TRes> (value: EndpointSchema<TReq, TRes>) => {
			if (value.path === "$connect" || value.path === "$disconnect") return;
			this.jfChatterBoxWsApi.addRoute(value.path, getRouteOptions(value.path, this.apiFunnelLambda));
		});

		this.wsChatterBoxApiCallbackUrlParam = new ssm.StringParameter(this,
			`${wsChatterBoxApiName}-CallbackUrlParam`,
			{
				stringValue:   this.jfChatterBoxWsApiStage.callbackUrl,
				parameterName: chatterBoxCallbackUrlParamName
			});
	}

	private makeNotificationsWebSocketApi () {
		const wsNotificationsApiName = jfNotificationsApiSchema.name;
		const lambda                 = this.eventAndNotifsLambda;

		function getRouteOptions (routeName: string): WebSocketRouteOptions {
			return {
				integration:    new WebSocketLambdaIntegration(`${wsNotificationsApiName}-${routeName}-LambdaIntegration`,
					lambda),
				returnResponse: true,
			};
		}

		this.jfNotificationsWsApi      = new WebSocketApi(this, wsNotificationsApiName, {
			apiName:                wsNotificationsApiName,
			connectRouteOptions:    getRouteOptions("$connect"),
			disconnectRouteOptions: getRouteOptions("$disconnect"),
		});
		this.jfNotificationsWsApiStage = new WebSocketStage(this, `${wsNotificationsApiName}-ProdStage`, {
			webSocketApi: this.jfNotificationsWsApi,
			stageName:    'prod',
			autoDeploy:   true,
		});

		mapValues(jfNotificationsApiSchema.endpoints, <TReq, TRes> (value: EndpointSchema<TReq, TRes>) => {
			if (value.path === "$connect" || value.path === "$disconnect") return;
			this.jfNotificationsWsApi.addRoute(value.path, getRouteOptions(value.path));
		});

		this.wsNotificationsApiCallbackUrlParam = new ssm.StringParameter(this,
			`${wsNotificationsApiName}-CallbackUrlParam`,
			{
				stringValue:   this.jfNotificationsWsApiStage.callbackUrl,
				parameterName: notificationsCallbackUrlParamName
			});
	}

	private addEventsSnsTopicSubscriptions () {
		this.eventsSnsTopic.addSubscription(new LambdaSubscription(this.eventAndNotifsLambda, {}));
	}

	private grantIamPolicies () {
		this.wsChatterBoxApiCallbackUrlParam.grantRead(this.apiFunnelLambda);
		this.dbPassword.grantRead(this.apiFunnelLambda);
		this.redisPassword.grantRead(this.apiFunnelLambda);
		this.jwtSecret.grantRead(this.apiFunnelLambda);
		this.s3Bucket.grantDelete(this.apiFunnelLambda);
		this.s3Bucket.grantPut(this.apiFunnelLambda);
		this.s3Bucket.grantPutAcl(this.apiFunnelLambda);
		this.s3Bucket.grantReadWrite(this.apiFunnelLambda);
		this.messagesTable.grantReadWriteData(this.apiFunnelLambda);
		this.passwordResetOtpTable.grantReadWriteData(this.apiFunnelLambda);
		this.connectionsTable.grantReadWriteData(this.apiFunnelLambda);
		this.eventsSnsTopic.grantPublish(this.apiFunnelLambda);
		this.jfChatterBoxWsApi.grantManageConnections(this.apiFunnelLambda);
		this.addSesPolicy();

		this.wsNotificationsApiCallbackUrlParam.grantRead(this.eventAndNotifsLambda);
		this.redisPassword.grantRead(this.eventAndNotifsLambda);
		this.jwtSecret.grantRead(this.eventAndNotifsLambda);
		this.messagesTable.grantReadWriteData(this.eventAndNotifsLambda);
		this.connectionsTable.grantReadWriteData(this.eventAndNotifsLambda);
		this.settingsTable.grantReadWriteData(this.eventAndNotifsLambda);
		this.jfNotificationsWsApi.grantManageConnections(this.eventAndNotifsLambda);

		this.eventAndNotifsLambda.addToRolePolicy(new PolicyStatement({
			effect:    Effect.ALLOW,
			actions:   [
				"dynamodb:PartiQLSelect"
			],
			resources: [
				this.connectionsTable.tableArn,
				this.connectionsTable.tableArn + "/index/*"
			]
		}));
		this.eventAndNotifsLambda.addToRolePolicy(new PolicyStatement({
			effect:     Effect.DENY,
			actions:    [
				"dynamodb:PartiQLSelect"
			],
			resources:  [
				this.connectionsTable.tableArn,
				this.connectionsTable.tableArn + "/index/*"
			],
			conditions: {
				Bool: {
					"dynamodb:FullTableScan": [
						true
					]
				}
			}
		}));
	}

	private addSesPolicy () {
		this.apiFunnelLambda.addToRolePolicy(new PolicyStatement({
			effect:    Effect.ALLOW,
			actions:   [
				'ses:SendEmail',
				'ses:SendRawEmail',
				'ses:SendTemplatedEmail',
			],
			resources: [
				"*"
			],
		}));
	}
}
