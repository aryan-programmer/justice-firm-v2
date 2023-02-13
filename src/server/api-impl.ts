import {S3Client} from "@aws-sdk/client-s3";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import {APIGatewayProxyEvent} from "aws-lambda";
import {compareSync, hash} from "bcryptjs";
import {sign, verify} from "jsonwebtoken";
import {createPool, Pool, UpsertResult} from "mariadb";
import {
	AppointmentSparseData,
	GetAppointmentsInput,
	GetLawyerInput,
	justiceFirmApiSchema,
	LawyerSearchResult,
	OpenAppointmentRequestInput,
	RegisterClientInput,
	RegisterLawyerInput,
	SearchLawyersInput,
	SessionLoginInput
} from "../common/api-schema";
import {AuthToken, JWTHashedData} from "../common/api-types";
import {StatusEnum, UserAccessType} from "../common/db-types";
import {nn} from "../common/utils/asserts";
import {toNumIfNotNull} from "../common/utils/functions";
import {Nuly} from "../common/utils/types";
import {constants} from "../singularity/constants";
import {EndpointResult, FnParams} from "../singularity/endpoint";
import {message, Message, noContent, response} from "../singularity/helpers";
import {awsLambdaFunnelWrapper} from "../singularity/model.server";
import {APIImplementation} from "../singularity/schema";
import {saltRounds} from "./utils/constants";
import {uploadDataUrlToS3} from "./utils/functions";

const region    = nn(process.env.AWS_REGION);
const s3Bucket  = nn(process.env.S3_BUCKET);
const ssmClient = new SSMClient({region});
const s3Client  = new S3Client({region});

function generateAuthTokenResponse (userId: number | bigint, userType: UserAccessType, jwtSecret: string) {
	const expiryDate                  = null;
	const privateToken: JWTHashedData = {
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

function verifyAndDecodeJwtToken (data: string, jwtSecret: string) {
	const decoded            = verify(data, jwtSecret);
	const obj: JWTHashedData = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
	return obj;
}

export class JusticeFirmAPIImpl implements APIImplementation<typeof justiceFirmApiSchema> {
	private pool: Pool | Nuly        = null;
	private jwtSecret: string | Nuly = null;

	async registerLawyer (params: FnParams<RegisterLawyerInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<AuthToken>> {
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

		try {
			await conn.beginTransaction();

			const userInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO user(name, email, phone, address, password_hash, photo_path, type) VALUES (?, ?, ?, ?, ?, ?, 'lawyer');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			const userId = nn(userInsertRes.insertId);

			const lawyerInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO lawyer(id, latitude, longitude, certification_link, status) VALUES (?, ?, ?, ?, 'confirmed');",
				[userId, data.latitude, data.longitude, certificationRes.url]
			);

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

			return generateAuthTokenResponse(userId, UserAccessType.Lawyer, jwtSecret);
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async registerClient (params: FnParams<RegisterClientInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<AuthToken>> {
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

			const userInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO user(name, email, phone, address, password_hash, photo_path, type) VALUES (?, ?, ?, ?, ?, ?, 'client');",
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url]
			);

			const userId = nn(userInsertRes.insertId);

			const clientInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO client(id) VALUES (?);",
				[userId]
			);

			await conn.commit();

			return generateAuthTokenResponse(userId, UserAccessType.Client, jwtSecret);
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async sessionLogin (params: FnParams<SessionLoginInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<AuthToken | Message>> {
		const data: SessionLoginInput = params.body;

		const resSetP:
			      Promise<{ id: number | bigint, passwordHash: string, type: UserAccessType }[]> = this.getPool().then(
			pool => pool.execute(
				"SELECT id, password_hash AS passwordHash, type FROM user WHERE user.email = ?;",
				[data.email]
			)
		);

		const [jwtSecret, resSet] = await Promise.all([this.getJwtSecret(), resSetP]);

		if (resSet.length === 0) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Email not used to sign up a user");
		}
		const {passwordHash, id, type} = resSet[0];
		if (!compareSync(data.password, passwordHash)) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid password");
		}
		return generateAuthTokenResponse(id, type, jwtSecret);
	}

	async searchLawyers (params: FnParams<SearchLawyersInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<LawyerSearchResult[]>> {
		const data    = params.body;
		const name    = `%${data.name ?? ""}%`;
		const address = `%${data.address ?? ""}%`;

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
		}

		const lawyers: LawyerSearchResult[] = res.map(recordToLawyerSearchResult);
		return response(200, lawyers);
	}

	async getLawyer (params: FnParams<GetLawyerInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<LawyerSearchResult | Nuly>> {
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

		if (res.length === 0) {
			return response(404, null);
		}

		const lawyers: LawyerSearchResult = recordToLawyerSearchResult(res[0]);
		return response(200, lawyers);
	}

	async openAppointmentRequest (params: FnParams<OpenAppointmentRequestInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<Nuly | Message>> {
		const data: OpenAppointmentRequestInput = params.body;

		const jwtSecret = await this.getJwtSecret();
		const obj       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Client) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To open an appointment request the user must be authenticated as a client.");
		}

		const timestamp = data.timestamp == null ? null : new Date(data.timestamp);

		console.log("Now: ", new Date().toString());

		const conn = await this.getConnection();

		try {
			await conn.beginTransaction();

			let lawyerId                       = data.lawyerId;
			let clientId                       = data.authToken.id;
			const groupInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO `group`(client_id, lawyer_id) VALUES (?, ?);",
				[clientId, lawyerId]
			);

			console.log({groupInsertRes});

			const groupId = nn(groupInsertRes.insertId);

			const appointmentInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO appointment(client_id, lawyer_id, group_id, description, timestamp) VALUES (?, ?, ?, ?, ?);",
				[clientId, lawyerId, groupId, data.description, timestamp]
			);

			console.log({appointmentInsertRes});

			await conn.commit();

			return noContent;
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async getAppointments (params: FnParams<GetAppointmentsInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<AppointmentSparseData[] | Message>> {
		const data      = params.body;
		const jwtSecret = await this.getJwtSecret();
		const jwt       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt.userType === UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To open an appointment request the user must be authenticated as a client.");
		}

		let sql: string;
		if (jwt.userType === UserAccessType.Client) {
			sql = `SELECT a.id,
			              l.id   AS oth_id,
			              l.name AS oth_name,
			              a.description,
			              a.group_id,
			              a.timestamp,
			              a.opened_on
			       FROM appointment a
			       JOIN user c
			            ON c.id = a.client_id
			       JOIN user l
			            ON l.id = a.lawyer_id
			       WHERE c.id = ?
				     AND a.status = ?`;
		} else {
			sql = `SELECT a.id,
			              c.id   AS oth_id,
			              c.name AS oth_name,
			              a.description,
			              a.group_id,
			              a.timestamp,
			              a.opened_on
			       FROM appointment a
			       JOIN user c
			            ON c.id = a.client_id
			       JOIN user l
			            ON l.id = a.lawyer_id
			       WHERE l.id = ?
				     AND a.status = ?`;
		}
		if (data.orderByOpenedOn === true) {
			sql += " ORDER BY a.opened_on;";
		} else {
			sql += " ORDER BY a.timestamp;";
		}
		const res: Record<string, any>[] = await (await this.getPool()).execute(sql, [jwt.id, data.withStatus]);
		return response(200, res.map(value => {
			return {
				id:          value.id.toString(),
				othId:       value.oth_id.toString(),
				othName:     value.oth_name.toString(),
				description: value.description.toString(),
				groupId:     value.group_id.toString(),
				timestamp:   value.timestamp?.toString(),
				openedOn:    value.opened_on.toString(),
			} as AppointmentSparseData;
		}));
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
