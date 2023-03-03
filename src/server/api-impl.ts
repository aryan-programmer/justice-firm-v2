import {S3Client} from "@aws-sdk/client-s3";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import {APIGatewayProxyEvent} from "aws-lambda";
import {compareSync, hash} from "bcryptjs";
import {sign, verify} from "jsonwebtoken";
import {createPool, Pool, UpsertResult} from "mariadb";
import {
	AppointmentFullData,
	AppointmentSparseData,
	ClientDataResult,
	GetAppointmentByIdInput,
	GetAppointmentsInput,
	GetLawyerInput,
	GetWaitingLawyersInput,
	justiceFirmApiSchema,
	LawyerSearchResult,
	OpenAppointmentRequestInput,
	RegisterClientInput,
	RegisterLawyerInput,
	SearchLawyersInput,
	SessionLoginInput,
	SetAppointmentStatusInput,
	SetLawyerStatusesInput
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
				"INSERT INTO lawyer(id, latitude, longitude, certification_link, status) VALUES (?, ?, ?, ?, 'waiting');",
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
				 LIMIT 25;`, [data.latitude, data.longitude, name, address]);
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

	async getWaitingLawyers (params: FnParams<GetWaitingLawyersInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<LawyerSearchResult[] | Message>> {
		const data      = params.body;
		const jwtSecret = await this.getJwtSecret();
		const obj       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To get the list of waiting lawyers the user must be authenticated as an administrator.");
		}

		let res: Record<string, any>[]      = await (await this.getPool()).execute(
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
			 WHERE l.status = 'waiting'
			 LIMIT 25;`);
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
			              a.case_id,
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
			              a.case_id,
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
				caseId:      value.case_id?.toString(),
				groupId:     value.group_id.toString(),
				timestamp:   value.timestamp?.toString(),
				openedOn:    value.opened_on.toString(),
			} as AppointmentSparseData;
		}));
	}

	async setLawyerStatuses (params: FnParams<SetLawyerStatusesInput>, event: APIGatewayProxyEvent):
		Promise<EndpointResult<Message | Nuly>> {
		const data      = params.body;
		const jwtSecret = await this.getJwtSecret();
		const obj       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To set the statuses of lawyers the user must be authenticated as an administrator.");
		}
		if (data.rejected.length === 0 && data.confirmed.length === 0) return noContent;
		const conn = await this.getConnection();
		try {
			await conn.beginTransaction();

			if (data.confirmed.length > 0) {
				const sqlConfirmTuple = "?" + ",?".repeat(data.confirmed.length - 1);

				const confirmRes: UpsertResult = await conn.execute(
					`UPDATE lawyer
					 SET status = 'confirmed'
					 WHERE id IN (${sqlConfirmTuple});`,
					data.confirmed.map(BigInt)
				);
			}

			if (data.rejected.length > 0) {
				const sqlRejectTuple = "?" + ",?".repeat(data.rejected.length - 1);

				const rejectRes: UpsertResult = await conn.execute(
					`UPDATE lawyer
					 SET status = 'rejected'
					 WHERE id IN (${sqlRejectTuple});`,
					data.rejected.map(BigInt)
				);
			}

			await conn.commit();

			return noContent;
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async getAppointmentRequest (params: FnParams<GetAppointmentByIdInput>):
		Promise<EndpointResult<Message | AppointmentFullData | Nuly>> {
		const data      = params.body;
		const jwtSecret = await this.getJwtSecret();
		const jwt       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt == null) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid auth token");
		}

		const res: Record<string, any>[] = await (await this.getPool()).execute(
			`
				SELECT a.id                  AS a_id,
				       a.group_id            AS a_group_id,
				       a.case_id             AS a_case_id,
				       a.description         AS a_description,
				       a.timestamp           AS a_timestamp,
				       a.opened_on           AS a_opened_on,
				       a.status              AS a_status,
				       c.id                  AS c_id,
				       c.name                AS c_name,
				       c.email               AS c_email,
				       c.phone               AS c_phone,
				       c.address             AS c_address,
				       c.photo_path          AS c_photo_path,
				       lu.id                 AS l_id,
				       lu.name               AS l_name,
				       lu.email              AS l_email,
				       lu.phone              AS l_phone,
				       lu.address            AS l_address,
				       lu.photo_path         AS l_photo_path,
				       ll.latitude           AS l_latitude,
				       ll.longitude          AS l_longitude,
				       ll.certification_link AS l_certification_link
				FROM appointment a
				JOIN user c
				     ON c.id = a.client_id
				JOIN user lu
				     ON lu.id = a.lawyer_id
				JOIN lawyer ll
				     ON lu.id = ll.id
				WHERE a.id = ?;`, [BigInt(data.id)]);

		if (res.length === 0) {
			return response(404, null);
		}

		const value                      = res[0];
		const lawyer: LawyerSearchResult = {
			id:                value.l_id.toString(),
			name:              value.l_name.toString(),
			email:             value.l_email.toString(),
			phone:             value.l_phone.toString(),
			address:           value.l_address.toString(),
			photoPath:         value.l_photo_path.toString(),
			latitude:          Number(value.l_latitude),
			longitude:         Number(value.l_longitude),
			certificationLink: value.l_certification_link.toString(),
			status:            StatusEnum.Confirmed,
			distance:          undefined,
		} as LawyerSearchResult;
		const client: ClientDataResult   = {
			id:        value.c_id.toString(),
			name:      value.c_name.toString(),
			email:     value.c_email.toString(),
			phone:     value.c_phone.toString(),
			address:   value.c_address.toString(),
			photoPath: value.c_photo_path.toString(),
		} as ClientDataResult;
		if (lawyer.id !== jwt.id && client.id !== jwt.id) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				`User id ${jwt.id} is not allowed access the details of appointment ${data.id}`);
		}
		const appointment: AppointmentFullData = {
			id:          value.a_id.toString(),
			description: value.a_description.toString(),
			caseId:      value.a_case_id?.toString(),
			groupId:     value.a_group_id.toString(),
			timestamp:   value.a_timestamp?.toString(),
			openedOn:    value.a_opened_on.toString(),
			status:      value.a_status.toString(),
			client,
			lawyer,
		};
		return response(200, appointment);
	}

	async setAppointmentStatus (params: FnParams<SetAppointmentStatusInput>):
		Promise<EndpointResult<Message | Nuly>> {
		const data      = params.body;
		const jwtSecret = await this.getJwtSecret();
		const jwt       = verifyAndDecodeJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt.userType !== UserAccessType.Lawyer) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To set an appointment's status the user must be authenticated as a lawyer");
		}
		const pool = await this.getPool();
		if (data.status === StatusEnum.Rejected) {
			const rejectRes: UpsertResult = await pool.execute(
				`UPDATE appointment
				 SET status='rejected'
				 WHERE id = ?
				   AND lawyer_id = ?;`,
				[data.appointmentId, jwt.id]
			);
			if (rejectRes.affectedRows === 0) {
				return message(constants.HTTP_STATUS_BAD_REQUEST,
					`Either the appointment with the id ${data.appointmentId} doesn't exist or you do not have access to edit it.`);
			}
		} else {
			let confirmRes: UpsertResult;
			if (data.timestamp == null) {
				confirmRes = await pool.execute(
					`UPDATE appointment
					 SET status='confirmed'
					 WHERE id = ?
					   AND lawyer_id = ?;`,
					[data.appointmentId, jwt.id]
				);
			} else {
				confirmRes = await pool.execute(
					`UPDATE appointment
					 SET status='confirmed',
					     timestamp=?
					 WHERE id = ?
					   AND lawyer_id = ?;`,
					[new Date(data.timestamp), data.appointmentId, jwt.id]
				);
			}
			if (confirmRes.affectedRows === 0) {
				return message(constants.HTTP_STATUS_BAD_REQUEST,
					`Either the appointment with the id ${data.appointmentId} doesn't exist or you do not have access to edit it.`);
			}
		}
		return noContent;
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
				host:                  nn(process.env.DB_ENDPOINT),
				port:                  +nn(process.env.DB_PORT),
				user:                  nn(process.env.DB_USERNAME),
				password:              nn(password.Parameter).Value,
				database:              "justice_firm",
				acquireTimeout:        2500,
				// AWS RDS MariaDB can't create more than 5-6 for some reason
				connectionLimit:       4,
				initializationTimeout: 1000,
				leakDetectionTimeout:  3000,
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
