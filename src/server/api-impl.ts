import * as ssm                                    from "@aws-sdk/client-ssm";
import {APIGatewayProxyEvent}                      from "aws-lambda";
import {Connection, createPool, Pool}              from "mariadb";
import {justiceFirmApiSchema, RegisterLawyerInput} from "../common/api-schema";
import {AuthToken}                                 from "../common/api-types";
import nn                                          from "../common/utils/nn";
import {Nuly}                                      from "../common/utils/types";
import {EndpointResult, FnParams, UnknownBody}     from "../singularity/endpoint";
import {message, Message}                          from "../singularity/helpers";
import {awsLambdaFunnelWrapper}                    from "../singularity/model.server";
import {APIImplementation}                         from "../singularity/schema";

const region = process.env.AWS_REGION;
const client = new ssm.SSMClient({region});

export class JusticeFirmAPIImpl implements APIImplementation<typeof justiceFirmApiSchema> {
	private pool: Pool | Nuly       = null;
	private conn: Connection | Nuly = null;

	async registerLawyer (params: FnParams<RegisterLawyerInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<AuthToken>> {
		// const data = params.body;
		// data.photoData
		// const conn = await this.getConnection();
		// conn.execute(``);
		throw new Error("Unimplemented");
	}

	async test (params: FnParams<UnknownBody>, event: APIGatewayProxyEvent): Promise<EndpointResult<Message>> {
		return message(200, {
			// env: process.env,
		});
	}

	private async getConnection () {
		if (this.pool == null) {
			const password = await client.send(new ssm.GetParameterCommand({
				Name:           process.env.DB_PASSWORD,
				WithDecryption: true
			}));
			this.pool      = await createPool({
				host:     nn(process.env.DB_ENDPOINT),
				port:     +nn(process.env.DB_PORT),
				user:     nn(process.env.DB_USERNAME),
				password: nn(password.Parameter).Value,
			});
		}
		if (this.conn == null || !this.conn.isValid()) {
			await this.conn?.end();
			return this.conn = await nn(this.pool).getConnection();
		}
		return this.conn;
	}
}

export function mathApiAwsFunnelFunctions () {
	const obj = new JusticeFirmAPIImpl();
	return awsLambdaFunnelWrapper(justiceFirmApiSchema, obj);
}
