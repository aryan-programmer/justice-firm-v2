import * as cdk                                       from "aws-cdk-lib";
import {aws_apigateway as apiGateway, aws_ssm as ssm} from "aws-cdk-lib";
import {RestApi}                                      from "aws-cdk-lib/aws-apigateway";
import {Code, Function, FunctionProps, Runtime}       from "aws-cdk-lib/aws-lambda";
import {Construct}                                    from 'constructs';
import {mapValues}                                    from "lodash";
import 'reflect-metadata';
import {justiceFirmApiSchema}                         from "../common/api-schema";
import {Nuly}                                         from "../common/utils/types";
import {pathSchemaToString}                           from "../singularity/helpers";

const path = require("path");

// import * as sqs from 'aws-cdk-lib/aws-sqs';

type EndpointNames = keyof typeof justiceFirmApiSchema.endpoints;
type FunctionPropsMergeable = Partial<FunctionProps>;

class ResourceMap {
	_map: Record<string, ResourceMap | Nuly> = {};
	readonly _resource: apiGateway.IResource;

	constructor (resource: apiGateway.IResource) {
		this._resource = resource;
	}

	private getFromPathHelper (s: string[], i: number): apiGateway.IResource {
		const pathPart = s[i];
		if (i === s.length) return this._resource;
		const rv = (this._map[pathPart] ??= new ResourceMap(this._resource.addResource(pathPart)));
		return rv.getFromPathHelper(s, i + 1);
	}

	getFromPath (s: string) {
		if (s.startsWith("/")) s = s.substring(1,);
		return this.getFromPathHelper(s.length === 0 ? [] : s.split("/"), 0);
	}

	getDirect (s: string): ResourceMap | Nuly {
		return this._map[s];
	}

	get resource (): apiGateway.IResource {
		return this._resource;
	}
}

export class JusticeFirmStack extends cdk.Stack {
	constructor (scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		let apiName = justiceFirmApiSchema.name;

		const api = new RestApi(this, apiName, {
			deploy: true,
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

		const lambda = new Function(this, `${apiName}-FunnelFunction`, {
			...functionCommonProps,
			runtime:     Runtime.NODEJS_18_X,
			handler:     `app.handler`,
			code:        Code.fromAsset(path.resolve(__dirname, "../server/dist")),
			environment: {
				DB_ENDPOINT: dbEndpoint,
				DB_PORT:     dbPort,
				DB_USERNAME: dbUsername,
				DB_PASSWORD: dbPassword.parameterName,
			},
		});
		dbPassword.grantRead(lambda);

		const lambdaIntegration = new apiGateway.LambdaIntegration(lambda);
		const resourceMap       = new ResourceMap(api.root);

		mapValues(justiceFirmApiSchema.endpoints, (value, _key) => {
			// const key      = _key as EndpointNames;
			const apiPath  = pathSchemaToString(value.path);
			//console.log({apiPath});
			const resource = resourceMap.getFromPath(apiPath);
			resource.addMethod(value.method, lambdaIntegration);
		});
	}
}

/*
let apiName = singularityDemoApiSchema.name;
		const layer = new LayerVersion(this, `${apiName}-LambdaLayer`, {
			compatibleRuntimes: [Runtime.NODEJS_18_X],
			code: Code.fromAsset(path.resolve(__dirname, "../server/dist/api-impl")),
		});

		const api = new RestApi(this, apiName, {
			deploy: true,
		});

		const resourceMap = new ResourceMap(api.root);

		const functionCommonProps: FunctionPropsMergeable = {
		};

		const endpointOverrideProps: Partial<Record<EndpointNames, FunctionPropsMergeable>> = {
			getQuotes: {
				environment: {
					TABLE_NAME: quotesTable.tableName
				}
			}
		};

		const lambdas = mapValues(singularityDemoApiSchema.endpoints, (value, _key): Function => {
	const key = _key as EndpointNames;
	const lambda  = new Function(this, `${apiName}-${capitalizeFirstLetter(key)}`, {
		...functionCommonProps,
		...endpointOverrideProps[key],
		runtime: Runtime.NODEJS_18_X,
		layers: [layer],
		handler: `app.${key}`,
		code: Code.fromAsset(path.resolve(__dirname, "../server/dist"))
	});
	const apiPath = pathString(value.path);
	//console.log({apiPath});
	const resource = resourceMap.getFromPath(apiPath);
	resource.addMethod(value.method, new apiGateway.LambdaIntegration(lambda));
	return lambda;
});

quotesTable.grantReadWriteData(lambdas.getQuotes)
*/
