import {S3Client} from "@aws-sdk/client-s3";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import {APIGatewayProxyEvent} from "aws-lambda";
import {compareSync, hash} from "bcryptjs";
import {sign} from "jsonwebtoken";
import {createPool, Pool, UpsertResult} from "mariadb";
import {
	GetLawyerInput,
	justiceFirmApiSchema,
	LawyerSearchResult,
	RegisterClientInput,
	RegisterLawyerInput,
	SearchLawyersInput,
	SessionLoginInput
} from "../common/api-schema";
import {AuthToken, PrivateAuthToken} from "../common/api-types";
import {StatusEnum, UserAccessType} from "../common/db-types";
import {nn} from "../common/utils/asserts";
import {toNumIfNotNull} from "../common/utils/functions";
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

function recordToLawyerSearchResult (value: Record<string, any>) {
	return {
		id:                value.id.toString(),
		name:              value.name.toString(),
		email:             value.email.toString(),
		phone:             value.phone.toString(),
		address:           value.address.toString(),
		photoPath:         value.photo_path.toString(),
		latitude:          Number(value.latitude),
		longitude:         Number(value.longitude),
		certificationLink: value.certification_link.toString(),
		status:            StatusEnum.Confirmed,
		distance:          toNumIfNotNull(value.distance)
	} as LawyerSearchResult;
}

export class JusticeFirmAPIImpl implements APIImplementation<typeof justiceFirmApiSchema> {
	private pool: Pool | Nuly        = null;
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
				"INSERT INTO user(name, email, phone, address, password_hash, photo_path, type) VALUES (?, ?, ?, ?, ?, ?, 'lawyer');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			const userId = nn(userInsertRes.insertId);

			console.log(userInsertRes);

			const lawyerInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO lawyer(id, latitude, longitude, certification_link, status) VALUES (?, ?, ?, ?, 'confirmed');",
				[userId, data.latitude, data.longitude, certificationRes.url]
			);

			console.log(lawyerInsertRes);

			if (data.specializationTypes.length > 0) {
				let params = data.specializationTypes.map(value => ([userId, value]));
				console.log(params);
				const specRes = await conn.batch(
					"INSERT INTO lawyer_specialization(lawyer_id, case_type_id) VALUES (?, ?);",
					params
				);

				console.log(specRes);
			}

			await conn.commit();

			console.log("Committed");

			return generateAuthTokenResponse(userId, UserAccessType.Lawyer, jwtSecret);
		} catch (e) {
			await conn.rollback();
			await conn.release();
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
				"INSERT INTO user(name, email, phone, address, password_hash, photo_path, type) VALUES (?, ?, ?, ?, ?, ?, 'client');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			console.log(userInsertRes);

			const userId = nn(userInsertRes.insertId);

			const clientInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO client(id) VALUES (?);",
				[userId]
			);

			console.log(clientInsertRes);

			await conn.commit();

			return generateAuthTokenResponse(userId, UserAccessType.Client, jwtSecret);
		} catch (e) {
			await conn.rollback();
			await conn.release();
			throw e;
		}
	}

	async sessionLogin (params: FnParams<SessionLoginInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<AuthToken | Message>> {
		const data: SessionLoginInput = params.body;

		const resSetP:
			      Promise<{ id: number | bigint, passwordHash: string, type: UserAccessType }[]> = this.getPool().then(
			pool => pool.execute(
				"SELECT id, password_hash AS passwordHash, type FROM user WHERE user.email = ?;",
				[data.email]
			)
		);

		const [jwtSecret, resSet] = await Promise.all([this.getJwtSecret(), resSetP]);

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

	async searchLawyers (params: FnParams<SearchLawyersInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<LawyerSearchResult[]>> {
		const data    = params.body;
		const name    = `%${data.name}%`;
		const address = `%${data.address}%`;

		let res: Record<string, any>[];
		if ("latitude" in data && "longitude" in data && data.latitude != null && data.longitude != null) {
			res = await (await this.getPool()).execute(
				`SELECT u.id,
				        u.name,
				        u.email,
				        u.phone,
				        u.address,
				        u.photo_path,
				        l.latitude,
				        l.longitude,
				        l.certification_link,
				        ST_DISTANCE_SPHERE(POINT(l.latitude, l.longitude), POINT(?, ?)) AS distance
				 FROM lawyer l
				 JOIN user u
				      ON u.id = l.id
				 WHERE l.status = 'confirmed'
				   AND u.name LIKE ?
				   AND u.address LIKE ?
				 ORDER BY distance ASC
				 LIMIT 10;`, [data.latitude, data.longitude, name, address]);
			console.log("Sphericals");
		} else {
			res = await (await this.getPool()).execute(
				`SELECT u.id,
				        u.name,
				        u.email,
				        u.phone,
				        u.address,
				        u.photo_path,
				        l.latitude,
				        l.longitude,
				        l.certification_link
				 FROM lawyer l
				 JOIN user u
				      ON u.id = l.id
				 WHERE l.status = 'confirmed'
				   AND u.name LIKE ?
				   AND u.address LIKE ?
				 ORDER BY name ASC
				 LIMIT 25;`, [name, address]);
			console.log("Standards");
		}
		console.log(res, data);

		const lawyers: LawyerSearchResult[] = res.map(recordToLawyerSearchResult);
		return response(200, lawyers);
	}

	async getLawyer (params: FnParams<GetLawyerInput>, event: APIGatewayProxyEvent): Promise<EndpointResult<LawyerSearchResult | Nuly>> {
		const data = params.body;

		const res: Record<string, any>[] = await (await this.getPool()).execute(
			`SELECT u.id,
			        u.name,
			        u.email,
			        u.phone,
			        u.address,
			        u.photo_path,
			        l.latitude,
			        l.longitude,
			        l.certification_link
			 FROM lawyer l
			 JOIN user u
			      ON u.id = l.id
			 WHERE l.status = 'confirmed'
			   AND l.id = ?;`, [+data.id]);
		console.log("From id");
		console.log(res, data);

		if (res.length === 0) {
			return response(404, null);
		}

		const lawyers: LawyerSearchResult = recordToLawyerSearchResult(res[0]);
		return response(200, lawyers);
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
		return await (await this.getPool()).getConnection();
	}

	private async getPool () {
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
		console.log({
			active: this.pool.activeConnections(),
			idle:   this.pool.idleConnections(),
			total:  this.pool.totalConnections(),
		});
		return this.pool;
	}
}

export function mathApiAwsFunnelFunctions () {
	const obj = new JusticeFirmAPIImpl();
	return awsLambdaFunnelWrapper(justiceFirmApiSchema, obj, {
		validateOutputs: false
	});
}
