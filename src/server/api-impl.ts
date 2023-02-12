import {S3Client} from "@aws-sdk/client-s3";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import {APIGatewayProxyEvent} from "aws-lambda";
import {compareSync, hash} from "bcryptjs";
import {sign} from "jsonwebtoken";
import {Connection, createPool, Pool, UpsertResult} from "mariadb";
import {justiceFirmApiSchema, RegisterClientInput, RegisterLawyerInput, SessionLoginInput} from "../common/api-schema";
import {AuthToken, PrivateAuthToken} from "../common/api-types";
import {Client, UserAccessType} from "../common/db-types";
import {nn} from "../common/utils/asserts";
import {Nuly} from "../common/utils/types";
import {constants} from "../singularity/constants";
import {EndpointResult, FnParams} from "../singularity/endpoint";
import {message, Message, response} from "../singularity/helpers";
import {awsLambdaFunnelWrapper} from "../singularity/model.server";
import {APIImplementation} from "../singularity/schema";
import {saltRounds} from "./utils/constants";
import {uploadDataUrlToS3} from "./utils/functions";

const region    = nn(process.env.AWS_REGION);
const s3Bucket  = nn(process.env.S3_BUCKET);
const ssmClient = new SSMClient({region});
const s3Client  = new S3Client({region});

function generateAuthTokenResponse (userId: number | bigint, userType: UserAccessType, jwtSecret: string) {
	const expiryDate                     = null;
	const privateToken: PrivateAuthToken = {
		id: userId.toString(10),
		userType,
		expiryDate,
	};
	return response(200, {
		id:  userId.toString(10),
		userType,
		expiryDate,
		jwt: sign(privateToken, jwtSecret)
	});
}

export class JusticeFirmAPIImpl implements APIImplementation<typeof justiceFirmApiSchema> {
	private pool: Pool | Nuly        = null;
	private conn: Connection | Nuly  = null;
	private jwtSecret: string | Nuly = null;

	async registerLawyer (params: FnParams<RegisterLawyerInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<AuthToken>> {
		const data: RegisterLawyerInput = params.body;

		const jwtSecretP        = this.getJwtSecret();
		const connP             = this.getConnection();
		const passwordHashP     = hash(data.password, saltRounds);
		const photoResP         = uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl: data.photoData,
			name:    data.name,
			prefix:  "lawyers/photos/"
		});
		const certificationResP = uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl: data.certificationData,
			name:    data.name,
			prefix:  "lawyers/certifications/"
		});

		const [conn, passwordHash, photoRes, certificationRes, jwtSecret] =
			      await Promise.all([connP, passwordHashP, photoResP, certificationResP, jwtSecretP]);

		console.log({conn, passwordHash, photoRes, certificationRes});

		try {
			await conn.beginTransaction();

			console.log("Started transaction");

			const userInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO `user`(`name`, `email`, `phone`, `address`, `password_hash`, `photo_path`, `type`) VALUES (?, ?, ?, ?, ?, ?, 'lawyer');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			const userId = nn(userInsertRes.insertId);

			console.log(userInsertRes);

			const lawyerInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO `lawyer`(`id`, `latitude`, `longitude`, `certification_link`) VALUES (?, ?, ?, ?);",
				[userId, data.latitude, data.longitude, certificationRes.url]
			);

			console.log(lawyerInsertRes);

			if (data.specializationTypes.length > 0) {
				let params = data.specializationTypes.map(value => ([userId, value]));
				console.log(params);
				const specRes = await conn.batch(
					"INSERT INTO `lawyer_specialization`(`lawyer_id`, `case_type_id`) VALUES (?, ?);",
					params
				);

				console.log(specRes);
			}

			await conn.commit();

			console.log("Committed");

			return generateAuthTokenResponse(userId, UserAccessType.Lawyer, jwtSecret);
		} catch (e) {
			await conn.rollback();
			throw e;
		}
	}

	async registerClient (params: FnParams<RegisterClientInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<AuthToken>> {
		const data: RegisterClientInput = params.body;

		const jwtSecretP    = this.getJwtSecret();
		const connP         = this.getConnection();
		const passwordHashP = hash(data.password, saltRounds);
		const photoResP     = uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl: data.photoData,
			name:    data.name,
			prefix:  "clients/photos/"
		});

		const [conn, passwordHash, photoRes, jwtSecret] =
			      await Promise.all([connP, passwordHashP, photoResP, jwtSecretP]);

		console.log({conn, passwordHash, photoRes});

		try {
			await conn.beginTransaction();

			console.log("Started transaction");

			const userInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO `user`(`name`, `email`, `phone`, `address`, `password_hash`, `photo_path`, `type`) VALUES (?, ?, ?, ?, ?, ?, 'client');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			console.log(userInsertRes);

			const userId = nn(userInsertRes.insertId);

			const clientInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO `client`(`id`) VALUES (?);",
				[userId]
			);

			console.log(clientInsertRes);

			await conn.commit();

			return generateAuthTokenResponse(userId, UserAccessType.Client, jwtSecret);
		} catch (e) {
			await conn.rollback();
			throw e;
		}
	}

	async sessionLogin (params: FnParams<SessionLoginInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<AuthToken | Message>> {
		const data: SessionLoginInput = params.body;

		const [jwtSecret, conn] = await Promise.all([this.getJwtSecret(), this.getConnection()]);

		const resSet: Pick<Client, "id" | "passwordHash" | "type">[] = await conn.execute(
			"SELECT `id`, `password_hash` AS `passwordHash`, `type` FROM `user` WHERE `user`.`email` = ?;",
			[data.email]
		);
		console.log(resSet);
		if (resSet.length === 0) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Email not used to sign up a user");
		}
		const {passwordHash, id, type} = resSet[0];
		if (!compareSync(data.password, passwordHash)) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid password");
		}
		return generateAuthTokenResponse(id, type, jwtSecret);
	}

	// async test (params: FnParams<UnknownBody>, event: APIGatewayProxyEvent): Promise<EndpointResult<Message>> {
	// 	return message(200, {
	// 		msg: "Test successful"
	// 		// env: process.env,
	// 	});
	// }

	private async getJwtSecret () {
		return this.jwtSecret ??= nn((await ssmClient.send(new GetParameterCommand({
			Name:           process.env.JWT_SECRET,
			WithDecryption: true
		}))).Parameter?.Value);
	}

	private async getConnection () {
		if (this.pool == null) {
			const password = await ssmClient.send(new GetParameterCommand({
				Name:           process.env.DB_PASSWORD,
				WithDecryption: true
			}));
			this.pool      = createPool({
				host:     nn(process.env.DB_ENDPOINT),
				port:     +nn(process.env.DB_PORT),
				user:     nn(process.env.DB_USERNAME),
				password: nn(password.Parameter).Value,
				database: "justice_firm",
			});
		}
		if (this.conn == null || !this.conn.isValid()) {
			console.log("Opening new connection: ", {oldConn: this.conn, validity: this.conn?.isValid()});
			await this.conn?.end();
			return this.conn = await nn(this.pool).getConnection();
		}
		return this.conn;
	}
}

export function mathApiAwsFunnelFunctions () {
	const obj = new JusticeFirmAPIImpl();
	return awsLambdaFunnelWrapper(justiceFirmApiSchema, obj, {
		validateOutputs: false
	});
}
