// noinspection JSUnusedGlobalSymbols

import {DeleteItemCommand, PutItemCommand, ReturnConsumedCapacity, ReturnValue} from "@aws-sdk/client-dynamodb";
import {S3Client} from "@aws-sdk/client-s3";
import {SendEmailCommand, SESClient} from "@aws-sdk/client-ses";
import {compareSync, hash} from "bcryptjs";
import {sign} from "jsonwebtoken";
import {pq} from "~~/src/server/common/background-promise-queue";
import {ssEventsPublisher} from "~~/src/server/rest-ws-apis/ss-events-publisher";
import {
	AuthToken,
	ClientAuthToken,
	ConstrainedAuthToken,
	LawyerAuthToken,
	PrivateAuthToken,
} from "../../common/api-types";
import {
	CaseDocumentData,
	CaseStatusEnum,
	ClientDataResult,
	ID_T,
	LawyerSearchResult,
	StatusEnum,
	UserAccessType,
} from "../../common/db-types";
import {
	AddCaseDocumentInput,
	AppointmentFullData,
	AppointmentSparseData,
	CaseFullData,
	CaseSparseData,
	GetAppointmentsInput,
	GetByIdInput,
	GetCaseDocumentsInput,
	GetCasesDataInput,
	GetLawyerInput,
	GetLawyerStatusInput,
	GetLawyerStatusOutput,
	GetSelfProfileInput,
	GetSelfProfileOutput,
	justiceFirmApiSchema,
	OpenAppointmentRequestInput,
	RegisterClientInput,
	RegisterLawyerInput,
	ResetPasswordInput,
	SearchAllLawyersInput,
	SearchLawyersInput,
	SendPasswordResetOTPInput,
	SessionLoginInput,
	SetAppointmentStatusInput,
	SetLawyerStatusesInput,
	UpdateLawyerProfileInput,
	UpdateProfileInput,
	UpgradeAppointmentToCaseInput,
	UploadFileInput,
} from "../../common/rest-api-schema";
import {nn} from "../../common/utils/asserts";
import {invalidImageMimeTypeMessage, otpMaxNum, otpMinNum, validImageMimeTypes} from "../../common/utils/constants";
import {isNullOrEmpty, nullOrEmptyCoalesce} from "../../common/utils/functions";
import {Nuly} from "../../common/utils/types";
import {constants} from "../../singularity/constants";
import {EndpointResult, FnParams} from "../../singularity/endpoint";
import {message, Message, noContent, response} from "../../singularity/helpers";
import {APIImplementation} from "../../singularity/schema";
import {dynamoDbClient, randomNumber, region, s3Bucket} from "../common/environment-clients";
import {otpExpiryTimeMs, saltRounds} from "../common/utils/constants";
import {dateToDynamoDbStr, strToDate} from "../common/utils/date-to-str";
import {
	getMimeTypeFromUrlServerSide,
	printConsumedCapacity,
	repeatedQuestionMarks,
	shortenS3Url,
	unShortenS3Url,
	uploadDataUrlToS3,
	verifyAndDecodeJwtToken,
} from "../common/utils/functions";
import {FileUploadData, FileUploadToken} from "../common/utils/types";
import {PostgresDbModel} from "../db/postgres-db-model";
import {PoolConnectionPatch, UpsertResult} from "../db/postgres-wrappers";

export const passwordResetOtpTableName = nn(process.env.PASSWORD_RESET_OTP_TABLE_NAME);
export const sesSourceEmailAddress     = nn(process.env.SES_SOURCE_EMAIL_ADDRESS);

export const s3Client  = new S3Client({region});
export const sesClient = new SESClient({region});

function generateAuthTokenResponse<T extends UserAccessType> (
	userId: number | bigint,
	userType: T,
	jwtSecret: string,
	userName: string | undefined = undefined,
): EndpointResult<ConstrainedAuthToken<T>> {
	const expiryDate                     = null;
	const privateToken: PrivateAuthToken = {
		id: userId.toString(10),
		userType,
		expiryDate,
	};
	return response(200, {
		id:   userId.toString(10),
		userType,
		expiryDate,
		jwt:  sign(privateToken, jwtSecret),
		name: userName,
	});
}

const verifyJwtToken     = verifyAndDecodeJwtToken<PrivateAuthToken>;
const verifyFileJwtToken = verifyAndDecodeJwtToken<FileUploadData>;

export class JusticeFirmRestAPIImpl
	implements APIImplementation<typeof justiceFirmApiSchema> {
	constructor (private common: PostgresDbModel) {
		// this.getLawyerData = function (this: JusticeFirmRestAPIImpl, ...args) {
		// 	return this.common.cacheResult("getLawyerData-" + JSON.stringify(args),
		// 		() => this.getLawyerData(...args)
		// 	);
		// };
	}

	async registerLawyer (params: FnParams<RegisterLawyerInput>):
		Promise<EndpointResult<LawyerAuthToken | Message>> {
		const data: RegisterLawyerInput = params.body;

		const photoMimeType = await getMimeTypeFromUrlServerSide(data.photoData);

		if (!validImageMimeTypes.includes(photoMimeType)) {
			return message(constants.HTTP_STATUS_BAD_REQUEST, invalidImageMimeTypeMessage);
		}

		const certificateMimeType = await getMimeTypeFromUrlServerSide(data.certificationData);

		const photoResP         = uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl:     data.photoData,
			name:        data.name,
			prefix:      "lawyers/photos/",
			contentType: photoMimeType,
		});
		const certificationResP = uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl:               data.certificationData,
			name:                  data.name,
			prefix:                "lawyers/certifications/",
			contentType:           certificateMimeType,
			keepOriginalExtension: true,
		});
		const jwtSecretP        = this.common.getJwtSecret();
		const passwordHashP     = hash(data.password, saltRounds);

		const [passwordHash, photoRes, certificationRes, jwtSecret] =
			      await Promise.all([passwordHashP, photoResP, certificationResP, jwtSecretP]);
		const conn                                                  = await this.common.getConnection();
		try {
			await conn.beginTransaction();

			const userInsertRes: UpsertResult = await conn.execute(
				`INSERT INTO "justice_firm"."user"(name, email, phone, address, password_hash, photo_path, gender, type)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'lawyer');`,
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url, data.gender],
			);

			const userId = nn(userInsertRes.insertId);

			const lawyerInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO lawyer(id, latitude, longitude, certification_link, status) VALUES (?, ?, ?, ?, 'waiting');",
				[userId, data.latitude, data.longitude, certificationRes.url],
			);

			if (data.specializationTypes.length > 0) {
				await this.insertSpecializationTypesWithConnection(data.specializationTypes, userId, conn);
			}

			await conn.commit();

			return generateAuthTokenResponse(userId, UserAccessType.Lawyer, jwtSecret, data.name);
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async getSelfProfile (params: FnParams<GetSelfProfileInput>):
		Promise<EndpointResult<GetSelfProfileOutput | Message>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType === UserAccessType.Lawyer) {
			const res = await this.common.getLawyerData(obj.id, {
				getStatistics:          true,
				getCaseSpecializations: true,
			});
			if (res == null) {
				return message(404, "Not found");
			}
			return response(200, res);
		}

		const pool                       = await this.common.getPool();
		const res: Record<string, any>[] = await pool.query(
			`SELECT u.id,
			        u.name,
			        u.email,
			        u.phone,
			        u.address,
			        u.photo_path,
			        u.gender
			 FROM "justice_firm"."user" u
			 WHERE u.id = ?;`, [BigInt(obj.id)]);

		if (res.length === 0) {
			return message(404, "No such user found");
		}

		return response(200, PostgresDbModel.recordToClientData(res[0]));
	}

	async updateProfile (params: FnParams<UpdateProfileInput>):
		Promise<EndpointResult<AuthToken | Message>> {
		const data: UpdateProfileInput = params.body;

		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (obj == null) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Unauthorized");
		}

		const updateQueryPieces = ["name = ?", "phone = ?", "address = ?", "gender = ?"];
		const updateQueryParams = [data.name, data.phone, data.address, data.gender];

		if (data.newPassword != null) {
			const passwordHash = await hash(data.newPassword, saltRounds);
			updateQueryPieces.push("password_hash = ?");
			updateQueryParams.push(passwordHash);
		}

		if (data.photoData != null) {
			const photoMimeType = await getMimeTypeFromUrlServerSide(data.photoData);

			if (!validImageMimeTypes.includes(photoMimeType)) {
				return message(constants.HTTP_STATUS_BAD_REQUEST, invalidImageMimeTypeMessage);
			}
			const photoRes = await uploadDataUrlToS3({
				s3Client,
				s3Bucket,
				region,
				dataUrl:     data.photoData,
				name:        data.name,
				prefix:      "clients/photos/",
				contentType: photoMimeType,
			});
			updateQueryPieces.push("photo_path = ?");
			updateQueryParams.push(photoRes.url);
		}

		const updateQuerySets = updateQueryPieces.join(", ");

		const id = BigInt(obj.id);

		const userUpdateRes: UpsertResult = await (await this.common.getPool()).execute(
			`UPDATE "justice_firm"."user"
			 SET ${updateQuerySets}
			 WHERE id = ?;`,
			[...updateQueryParams, id],
		);

		console.log({userUpdateRes});

		return generateAuthTokenResponse(id, obj.userType, jwtSecret, data.name);
	}

	async updateLawyerProfile (params: FnParams<UpdateLawyerProfileInput>):
		Promise<EndpointResult<LawyerAuthToken | Message>> {
		const data: UpdateLawyerProfileInput = params.body;

		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (obj == null || obj.userType !== UserAccessType.Lawyer) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "You must be a lawyer to use this method");
		}

		const userUpdateQueryPieces = ["name = ?", "phone = ?", "address = ?", "gender = ?"];
		const userUpdateQueryParams = [data.name, data.phone, data.address, data.gender];

		const lawyerUpdateQueryPieces                      = ["latitude = ?", "longitude = ?"];
		const lawyerUpdateQueryParams: (string | number)[] = [data.latitude, data.longitude];

		if (data.newPassword != null) {
			const passwordHash = await hash(data.newPassword, saltRounds);
			userUpdateQueryPieces.push("password_hash = ?");
			userUpdateQueryParams.push(passwordHash);
		}

		if (data.photoData != null) {
			const photoMimeType = await getMimeTypeFromUrlServerSide(data.photoData);

			if (!validImageMimeTypes.includes(photoMimeType)) {
				return message(constants.HTTP_STATUS_BAD_REQUEST, invalidImageMimeTypeMessage);
			}
			const photoRes = await uploadDataUrlToS3({
				s3Client,
				s3Bucket,
				region,
				dataUrl:     data.photoData,
				name:        data.name,
				prefix:      "lawyers/photos/",
				contentType: photoMimeType,
			});
			userUpdateQueryPieces.push("photo_path = ?");
			userUpdateQueryParams.push(photoRes.url);
		}

		if (data.certificationData != null) {
			const certificateMimeType = await getMimeTypeFromUrlServerSide(data.certificationData);
			const certificationRes    = await uploadDataUrlToS3({
				s3Client,
				s3Bucket,
				region,
				dataUrl:               data.certificationData,
				name:                  data.name,
				prefix:                "lawyers/certifications/",
				contentType:           certificateMimeType,
				keepOriginalExtension: true,
			});
			lawyerUpdateQueryPieces.push("certification_link = ?");
			lawyerUpdateQueryParams.push(certificationRes.url);
		}

		const invalidateCaseSpecializations = data.specializationTypes != null && data.specializationTypes.length > 0;

		pq.add(
			this.common.invalidateLawyerCache(obj.id, {invalidateCaseSpecializations}),
			"invalidateLawyerCache",
		);
		const lawyerId = BigInt(obj.id);

		const conn = await this.common.getConnection();
		try {
			await conn.beginTransaction();
			await conn.commit();

			const userUpdateQuerySets         = userUpdateQueryPieces.join(", ");
			const userUpdateRes: UpsertResult = await conn.execute(
				`UPDATE "justice_firm"."user"
				 SET ${userUpdateQuerySets}
				 WHERE id = ?;`,
				[...userUpdateQueryParams, lawyerId],
			);
			console.log({userUpdateRes});

			const lawyerUpdateQuerySets         = lawyerUpdateQueryPieces.join(", ");
			const lawyerUpdateRes: UpsertResult = await conn.execute(
				`UPDATE lawyer
				 SET ${lawyerUpdateQuerySets}
				 WHERE id = ?;`,
				[...lawyerUpdateQueryParams, lawyerId],
			);
			console.log({lawyerUpdateRes});

			if (invalidateCaseSpecializations && data.specializationTypes != null) {
				// TODO: Come up with a better system
				const deleteSpecializationsResult: UpsertResult = await conn.execute(
					`DELETE
					 FROM lawyer_specialization
					 WHERE lawyer_id = ?;`,
					[lawyerId],
				);
				const insertSpecializationsResult               = await this.insertSpecializationTypesWithConnection(
					data.specializationTypes,
					lawyerId,
					conn);
				console.log({deleteSpecializationsResult, insertSpecializationsResult});
			}
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}

		pq.add(ssEventsPublisher.lawyerProfileUpdate({
			ids: [lawyerId.toString()],
			invalidateCaseSpecializations,
		}));

		return generateAuthTokenResponse(lawyerId, UserAccessType.Lawyer, jwtSecret, data.name);
	}

	async registerClient (params: FnParams<RegisterClientInput>):
		Promise<EndpointResult<ClientAuthToken | Message>> {
		const data: RegisterClientInput = params.body;

		const jwtSecret    = await this.common.getJwtSecret();
		const passwordHash = await hash(data.password, saltRounds);

		const photoMimeType = await getMimeTypeFromUrlServerSide(data.photoData);

		if (!validImageMimeTypes.includes(photoMimeType)) {
			return message(constants.HTTP_STATUS_BAD_REQUEST, invalidImageMimeTypeMessage);
		}
		const photoRes = await uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl:     data.photoData,
			name:        data.name,
			prefix:      "clients/photos/",
			contentType: photoMimeType,
		});

		const conn = await this.common.getConnection();
		try {
			await conn.beginTransaction();

			const userInsertRes: UpsertResult = await conn.execute(
				`INSERT INTO "justice_firm"."user"(name, email, phone, address, password_hash, photo_path, gender, type)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'client');`,
				[data.name, data.email, data.phone, data.address, passwordHash, photoRes.url, data.gender],
			);

			const userId = nn(userInsertRes.insertId);

			const clientInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO client(id) VALUES (?);",
				[userId],
			);

			await conn.commit();

			return generateAuthTokenResponse(userId, UserAccessType.Client, jwtSecret, data.name);
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async sessionLogin (params: FnParams<SessionLoginInput>): Promise<EndpointResult<AuthToken | Message>> {
		const res = await this.getLoginResponse(params.body.email, params.body.password);
		if (res === false) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid password");
		}
		return res;
	}

	async searchLawyers (params: FnParams<SearchLawyersInput>):
		Promise<EndpointResult<LawyerSearchResult[]>> {
		console.log("/user/lawyer/search: searchLawyers: ", params);
		const data = params.body;

		let coords: { latitude: number; longitude: number } | Nuly = null;
		if ("latitude" in data && "longitude" in data && data.latitude != null && data.longitude != null) {
			coords = {latitude: +data.latitude, longitude: +data.longitude};
		}
		const res: LawyerSearchResult[] = await this.common.searchAllLawyers({
			address: data.address ?? "",
			email:   data.email ?? "",
			name:    data.name ?? "",
			coords:  coords,
			status:  StatusEnum.Confirmed,
		});

		return response(200, res);
	}

	async searchAllLawyers (params: FnParams<SearchAllLawyersInput>):
		Promise<EndpointResult<LawyerSearchResult[] | Message>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To get the list of waiting lawyers the user must be authenticated as an administrator.");
		}

		let coords: { latitude: number; longitude: number } | Nuly = null;
		if ("latitude" in data && "longitude" in data && data.latitude != null && data.longitude != null) {
			coords = {latitude: +data.latitude, longitude: +data.longitude};
		}
		const res: LawyerSearchResult[] = await this.common.searchAllLawyers({
			address:       data.address ?? "",
			email:         data.email ?? "",
			name:          data.name ?? "",
			coords:        coords,
			status:        data.status,
			getStatistics: true,
			forceRefetch:  true,
		});
		return response(200, res);
	}

	async getLawyer (params: FnParams<GetLawyerInput>):
		Promise<EndpointResult<LawyerSearchResult | Message>> {
		const data                             = params.body;
		const getBareAppointments              = data.getBareAppointments === true;
		const getBareCases                     = data.getBareCases === true;
		let authToken: PrivateAuthToken | Nuly = undefined;
		let forceRefetch                       = false;

		if (getBareAppointments || getBareCases) {
			const jwtSecret = await this.common.getJwtSecret();
			const obj       = data.authToken != null ? verifyJwtToken(data.authToken.jwt, jwtSecret) : null;
			if (obj == null || obj.userType !== UserAccessType.Admin) {
				return message(constants.HTTP_STATUS_UNAUTHORIZED,
					"To get the bare appointments or cases data the user must be authenticated as an administrator.");
			}
			authToken    = obj;
			forceRefetch = true;
		}

		const lawyer = await this.common.getLawyerData(data.id, {
			...data,
			forceRefetch,
		});
		if (lawyer == null) {
			return message(404, "No such lawyer found");
		}

		return response(200, lawyer);
	}

	async getLawyerStatusInformation (params: FnParams<GetLawyerStatusInput>):
		Promise<EndpointResult<GetLawyerStatusOutput | Message>> {
		const data = params.body;
		const res  = await this.common.getLawyerData(data.id);
		if (res === null) {
			return message(404, "No such lawyer found");
		}
		return response(200, {
			status:          res.status,
			rejectionReason: res.rejectionReason,
		});
	}

	async openAppointmentRequest (params: FnParams<OpenAppointmentRequestInput>):
		Promise<EndpointResult<ID_T | Message>> {
		const data: OpenAppointmentRequestInput = params.body;

		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Client) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To open an appointment request the user must be authenticated as a client.");
		}

		const lawyerStatus = await this.getLawyerStatusInformation({
			body: {
				id: data.lawyerId,
			},
		});
		if ("message" in lawyerStatus.body || lawyerStatus.body.status !== StatusEnum.Confirmed) {
			return message(constants.HTTP_STATUS_FORBIDDEN,
				"The lawyer with id " + data.lawyerId + " has not been confirmed.");
		}

		const timestamp = data.timestamp == null ? null : strToDate(data.timestamp);
		const conn      = await this.common.getConnection();

		try {
			await conn.beginTransaction();

			let lawyerId                             = BigInt(data.lawyerId);
			let clientId                             = BigInt(data.authToken.id);
			const groupInsertRes: UpsertResult       = await conn.execute(
				`INSERT INTO "justice_firm"."group"(client_id, lawyer_id)
				 VALUES (?, ?);`,
				[clientId, lawyerId],
			);
			const groupId                            = nn(groupInsertRes.insertId);
			const appointmentInsertRes: UpsertResult = await conn.execute(
				"INSERT INTO appointment(client_id, lawyer_id, group_id, description, timestamp) VALUES (?, ?, ?, ?, ?);",
				[clientId, lawyerId, groupId, data.description, timestamp],
			);

			await conn.commit();
			return response(200, nn(appointmentInsertRes.insertId).toString());
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async getAppointments (params: FnParams<GetAppointmentsInput>):
		Promise<EndpointResult<AppointmentSparseData[] | Message>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt.userType === UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To open an appointment request the user must be authenticated as a client.");
		}

		let sql: string;
		if (jwt.userType === UserAccessType.Client) {
			sql =
				`SELECT a.id,
				        l.id   AS oth_id,
				        l.name AS oth_name,
				        a.description,
				        a.case_id,
				        a.group_id,
				        a.timestamp,
				        a.opened_on
				 FROM appointment           a
				 JOIN "justice_firm"."user" c
				      ON c.id = a.client_id
				 JOIN "justice_firm"."user" l
				      ON l.id = a.lawyer_id
				 WHERE c.id = ?
				   AND a.status = ?`;
		} else {
			sql =
				`SELECT a.id,
				        c.id   AS oth_id,
				        c.name AS oth_name,
				        a.description,
				        a.case_id,
				        a.group_id,
				        a.timestamp,
				        a.opened_on
				 FROM appointment           a
				 JOIN "justice_firm"."user" c
				      ON c.id = a.client_id
				 JOIN "justice_firm"."user" l
				      ON l.id = a.lawyer_id
				 WHERE l.id = ?
				   AND a.status = ?`;
		}
		if (data.orderByOpenedOn === true) {
			sql += " ORDER BY a.opened_on;";
		} else {
			sql += " ORDER BY a.timestamp;";
		}
		const res: Record<string, any>[] = await (await this.common.getPool())
			.query(sql, [BigInt(jwt.id), data.withStatus]);
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

	async setLawyerStatuses (params: FnParams<SetLawyerStatusesInput>):
		Promise<EndpointResult<Message | Nuly>> {
		const {authToken, confirmed, rejected, waiting} = params.body;

		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(authToken.jwt, jwtSecret);
		if (obj.userType !== UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To set the statuses of lawyers the user must be authenticated as an administrator.");
		}
		if (rejected.length === 0 && confirmed.length === 0 && waiting.length === 0) return noContent;

		const resetIds = [...(waiting), ...(confirmed), ...rejected.map(v => v.id)];
		pq.add(this.common.invalidateLawyerCache(resetIds));

		const conn = await this.common.getConnection();
		try {
			await conn.beginTransaction();

			if (confirmed.length > 0) {
				const confirmRes: UpsertResult = await conn.execute(
					`UPDATE lawyer
					 SET status           = 'confirmed',
					     rejection_reason = NULL
					 WHERE id IN (${repeatedQuestionMarks(confirmed.length)});`,
					confirmed.map(BigInt),
				);
			}

			if (rejected.length > 0) {
				const rejectRes = await conn.batchUpdate(
					"lawyer",
					"id",
					"BIGINT",
					["status", "rejection_reason"],
					["lawyer_status", "text"],
					rejected.map(({id, reason}) => ({
						id:     BigInt(id),
						values: ["rejected", reason],
					})),
				);
				console.log({rejectRes});
			}

			if (waiting.length > 0) {
				const waitingRes: UpsertResult = await conn.execute(
					`UPDATE lawyer
					 SET status           = 'waiting',
					     rejection_reason = NULL
					 WHERE id IN (${repeatedQuestionMarks(waiting.length)});`,
					waiting.map(BigInt),
				);
			}

			await conn.commit();
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}

		pq.add(ssEventsPublisher.lawyerProfileUpdate({ids: resetIds}));
		pq.add(ssEventsPublisher.lawyersStatusesUpdate({confirmed, waiting, rejected}));

		return noContent;
	}

	async getAppointmentRequest (params: FnParams<GetByIdInput>):
		Promise<EndpointResult<Message | AppointmentFullData | Nuly>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt == null) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid auth token");
		}

		const res: Record<string, any>[] = await (await this.common.getPool()).query(
			`SELECT a.id                  AS a_id,
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
			        c.gender              AS c_gender,
			        lu.id                 AS l_id,
			        lu.name               AS l_name,
			        lu.email              AS l_email,
			        lu.phone              AS l_phone,
			        lu.address            AS l_address,
			        lu.photo_path         AS l_photo_path,
			        lu.gender             AS l_gender,
			        ll.latitude           AS l_latitude,
			        ll.longitude          AS l_longitude,
			        ll.certification_link AS l_certification_link,
			        ll.status             AS l_status,
			        ll.rejection_reason   AS l_rejection_reason
			 FROM appointment           a
			 JOIN "justice_firm"."user" c
			      ON c.id = a.client_id
			 JOIN "justice_firm"."user" lu
			      ON lu.id = a.lawyer_id
			 JOIN lawyer                ll
			      ON lu.id = ll.id
			 WHERE a.id = ?;`, [BigInt(data.id)]);

		if (res.length === 0) {
			return message(404, "No such appointment found");
		}

		const value            = res[0];
		const {lawyer, client} = this.extractAndParseLawyerAndClientData(value);
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
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt.userType !== UserAccessType.Lawyer) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To set an appointment's status the user must be authenticated as a lawyer");
		}
		const pool          = await this.common.getPool();
		const lawyerId      = BigInt(jwt.id);
		const appointmentId = BigInt(data.appointmentId);
		if (data.status === StatusEnum.Rejected) {
			const rejectRes: UpsertResult = await pool.execute(
				"UPDATE appointment SET status='rejected' WHERE id = ? AND lawyer_id = ?;",
				[appointmentId, lawyerId],
			);
			if (rejectRes.affectedRows === 0) {
				return message(constants.HTTP_STATUS_BAD_REQUEST,
					`Either the appointment with the id ${appointmentId} doesn't exist or you do not have access to edit it.`);
			}
		} else {
			let confirmRes: UpsertResult;
			if (data.timestamp == null) {
				confirmRes = await pool.execute(
					"UPDATE appointment SET status='confirmed' WHERE id = ? AND lawyer_id = ?;",
					[appointmentId, lawyerId],
				);
			} else {
				confirmRes = await pool.execute(
					"UPDATE appointment SET status='confirmed', timestamp=? WHERE id = ? AND lawyer_id = ?;",
					[new Date(data.timestamp), appointmentId, lawyerId],
				);
			}
			if (confirmRes.affectedRows === 0) {
				return message(constants.HTTP_STATUS_BAD_REQUEST,
					`Either the appointment with the id ${appointmentId} doesn't exist or you do not have access to edit it.`);
			}
		}
		return noContent;
	}

	async sendPasswordResetOTP (params: FnParams<SendPasswordResetOTPInput>):
		Promise<EndpointResult<Message | Nuly>> {
		const email                         = params.body.email;
		const result: Record<string, any>[] = await (await this.common.getPool()).query(
			`SELECT name
			 FROM "justice_firm"."user"
			 WHERE email = ?
			 LIMIT 1;`,
			[email],
		);
		if (result.length === 0) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "That email has not been used to sign up a user");
		}
		const name = result[0].name;

		const otp        = await randomNumber(otpMinNum, otpMaxNum);
		const putItemRes = await dynamoDbClient.send(new PutItemCommand({
			TableName:              passwordResetOtpTableName,
			Item:                   {
				email: {S: email}, // Primary
				otp:   {S: otp.toString(10)}, // Sort
				ts:    {S: dateToDynamoDbStr(new Date())},
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
		}));
		printConsumedCapacity("Put OTP", putItemRes);
		const emailContent     = `Hello ${name},
There was a request to change your password.
If you did not make this request then please ignore this email.
The OTP to reset the password is ${otp.toString(10)}

Sincerely,
The Justice Firm Foundation`;
		const emailContentHtml = emailContent.replace(/[\n\r]+/g, "<br/>");
		const sendEmailRes     = await sesClient.send(new SendEmailCommand({
			Source:      sesSourceEmailAddress,
			Destination: {
				ToAddresses: [email],
			},
			Message:     {
				Subject: {
					Charset: "UTF-8",
					Data:    "Password Reset OTP",
				},
				Body:    {
					Text: {
						Charset: "UTF-8",
						Data:    emailContent,
					},
					Html: {
						Charset: "UTF-8",
						Data:    emailContentHtml,
					},
				},
			},
		}));
		return noContent;
	}

	async resetPassword (params: FnParams<ResetPasswordInput>):
		Promise<EndpointResult<AuthToken | Message>> {
		const {email, otp, password} = params.body;
		const deleteRes              = await dynamoDbClient.send(new DeleteItemCommand({
			TableName:              passwordResetOtpTableName,
			Key:                    {
				email: {S: email}, // Primary
				otp:   {S: otp}, // Sort
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
			ReturnValues:           ReturnValue.ALL_OLD,
		}));
		printConsumedCapacity("Delete & get OTP", deleteRes);
		if (deleteRes.Attributes == null) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid OTP");
		}
		const timestampStr = deleteRes.Attributes.ts.S;
		if (timestampStr == null) {
			return message(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR, "Invalid timestamp");
		}
		const timestamp = +timestampStr;
		const now       = Date.now();
		const diff      = now - timestamp;
		if (diff < 0 || diff > otpExpiryTimeMs) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "OTP expired");
		}

		const passwordHash            = await hash(password, saltRounds);
		const updateRes: UpsertResult = await (await this.common.getPool()).execute(
			`UPDATE "justice_firm"."user" u
			 SET password_hash = ?
			 WHERE email = ?;`, [passwordHash, email]);

		if (updateRes.affectedRows < 1) {
			console.error("SHOULD NEVER GET HERE: OTP was sent to an email address not used to sign up a user.");
			return message(constants.HTTP_STATUS_NOT_FOUND, "No such email address has been used to sign up a user.");
		}

		const res = await this.getLoginResponse(email, password);
		if (res === false) {
			return message(constants.HTTP_STATUS_ACCEPTED, "Password set successfully but failed to login.");
		}
		return res;
	}

	async upgradeAppointmentToCase (params: FnParams<UpgradeAppointmentToCaseInput>):
		Promise<EndpointResult<ID_T | Message>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt == null || jwt.userType !== UserAccessType.Lawyer) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Auth token must be that of a lawyer");
		}

		const res: Record<string, any>[] = await (await this.common.getPool()).query(
			`SELECT a.id          AS a_id,
			        a.lawyer_id   AS l_id,
			        a.client_id   AS c_id,
			        a.group_id    AS a_group_id,
			        a.case_id     AS a_case_id,
			        a.description AS a_description
			 FROM appointment a
			 WHERE a.id = ?;`, [BigInt(data.appointmentId)]);

		if (res.length === 0) {
			return message(404, "No such appointment found");
		}

		const value    = res[0];
		const lawyerId = BigInt(value.l_id.toString());
		const clientId = BigInt(value.c_id.toString());

		const groupId       = BigInt(value.a_group_id.toString());
		const appointmentId = BigInt(value.a_id.toString());

		if (BigInt(jwt.id) !== lawyerId) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"You are not authorized to promote this appointment to a case.");
		}

		if (!isNullOrEmpty(value.a_case_id?.toString())) {
			return message(constants.HTTP_STATUS_BAD_REQUEST,
				"This appointment has already been promoted to a case.");
		}

		const caseDesc = nullOrEmptyCoalesce(data.description, value.a_description.toString());
		const status   = data.status ?? CaseStatusEnum.Open;

		const conn = await this.common.getConnection();

		try {
			await conn.beginTransaction();

			const caseInsertRes: UpsertResult = await conn.execute(
				`INSERT INTO "justice_firm"."case" (client_id, lawyer_id, type_id, group_id, description, status)
				 VALUES (?, ?, ?, ?, ?, ?);`,
				[clientId, lawyerId, data.type, groupId, caseDesc, status],
			);
			const caseId                      = nn(caseInsertRes.insertId);

			if (isNullOrEmpty(data.groupName)) {
				await conn.execute(
					`UPDATE "justice_firm"."group"
					 SET case_id = ?
					 WHERE id = ?`,
					[caseId, groupId],
				);
			} else {
				await conn.execute(
					`UPDATE "justice_firm"."group"
					 SET case_id = ?,
					     NAME    = ?
					 WHERE id = ?`,
					[caseId, data.groupName, groupId],
				);
			}

			const appointmentUpdateRes = await conn.execute(
				"UPDATE appointment SET case_id = ? WHERE id = ?",
				[caseId, appointmentId],
			);

			await conn.commit();
			return response(200, caseId.toString());
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			await conn.release();
		}
	}

	async getCasesData (params: FnParams<GetCasesDataInput>):
		Promise<EndpointResult<CaseSparseData[] | Message>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt.userType === UserAccessType.Admin) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				"To open an appointment request the user must be authenticated as a client.");
		}

		let sql: string;
		if (jwt.userType === UserAccessType.Client) {
			sql = `SELECT s.id,
			              l.id    AS oth_id,
			              l.name  AS oth_name,
			              s.description,
			              s.type_id,
			              ct.name AS type_name,
			              s.group_id,
			              s.opened_on,
			              s.status
			       FROM "justice_firm"."case" s
			       JOIN "justice_firm"."user" l ON l.id = s.lawyer_id
			       JOIN case_type             ct ON ct.id = s.type_id
			       WHERE s.client_id = ?
			       ORDER BY S.opened_on;`;
		} else {
			sql = `SELECT s.id,
			              c.id    AS oth_id,
			              c.name  AS oth_name,
			              s.description,
			              s.type_id,
			              ct.name AS type_name,
			              s.group_id,
			              s.opened_on,
			              s.status
			       FROM "justice_firm"."case" s
			       JOIN "justice_firm"."user" c ON c.id = s.client_id
			       JOIN case_type             ct ON ct.id = s.type_id
			       WHERE s.lawyer_id = ?
			       ORDER BY S.opened_on;`;
		}
		const res: Record<string, any>[] = await (await this.common.getPool())
			.query(sql, [BigInt(jwt.id)]);
		return response(200, res.map(value => {
			return {
				id:          value.id.toString(),
				othId:       value.oth_id.toString(),
				othName:     value.oth_name.toString(),
				description: value.description.toString(),
				groupId:     value.group_id.toString(),
				openedOn:    value.opened_on.toString(),
				status:      value.status.toString(),
				caseType:    {
					id:   value.type_id.toString(),
					name: value.type_name.toString(),
				},
			} as CaseSparseData;
		}));
	}

	async getCase (params: FnParams<GetByIdInput>):
		Promise<EndpointResult<Message | CaseFullData>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (jwt == null) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Invalid auth token");
		}

		const res: Record<string, any>[] = await (await this.common.getPool()).query(
			`SELECT s.id                  AS s_id,
			        s.group_id            AS s_group_id,
			        s.type_id             AS s_type_id,
			        ct.name               AS s_type_name,
			        s.description         AS s_description,
			        s.opened_on           AS s_opened_on,
			        s.status              AS s_status,
			        c.id                  AS c_id,
			        c.name                AS c_name,
			        c.email               AS c_email,
			        c.phone               AS c_phone,
			        c.address             AS c_address,
			        c.photo_path          AS c_photo_path,
			        c.gender              AS c_gender,
			        lu.id                 AS l_id,
			        lu.name               AS l_name,
			        lu.email              AS l_email,
			        lu.phone              AS l_phone,
			        lu.address            AS l_address,
			        lu.photo_path         AS l_photo_path,
			        lu.gender             AS l_gender,
			        ll.latitude           AS l_latitude,
			        ll.longitude          AS l_longitude,
			        ll.certification_link AS l_certification_link,
			        ll.status             AS l_status,
			        ll.rejection_reason   AS l_rejection_reason
			 FROM "justice_firm"."case" s
			 JOIN "justice_firm"."user" c ON c.id = s.client_id
			 JOIN "justice_firm"."user" lu ON lu.id = s.lawyer_id
			 JOIN lawyer                ll ON lu.id = ll.id
			 JOIN case_type             ct ON s.type_id = ct.id
			 WHERE s.id = ?;`, [BigInt(data.id)]);

		if (res.length === 0) {
			return message(404, "No such case found");
		}

		const value            = res[0];
		const {lawyer, client} = this.extractAndParseLawyerAndClientData(value);
		if (lawyer.id !== jwt.id && client.id !== jwt.id) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED,
				`User id ${jwt.id} is not allowed access the details of case ${data.id}`);
		}
		const caseFullData: CaseFullData = {
			id:          value.s_id.toString(),
			description: value.s_description.toString(),
			caseType:    {
				id:   value.s_type_id.toString(),
				name: value.s_type_name.toString(),
			},
			groupId:     value.s_group_id.toString(),
			openedOn:    value.s_opened_on.toString(),
			status:      value.s_status.toString(),
			client,
			lawyer,
		};
		return response(200, caseFullData);
	}

	async uploadFile (params: FnParams<UploadFileInput>):
		Promise<EndpointResult<Message | FileUploadToken>> {
		const data      = params.body;
		const jwtSecret = await this.common.getJwtSecret();
		const obj       = verifyJwtToken(data.authToken.jwt, jwtSecret);
		if (isNullOrEmpty(obj.id)) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Must be signed in to upload a file");
		}

		const fileMimeType = await getMimeTypeFromUrlServerSide(data.fileData);

		const uploadRes = await uploadDataUrlToS3({
			s3Client,
			s3Bucket,
			region,
			dataUrl:               data.fileData,
			name:                  data.fileName,
			prefix:                data.pathPrefix,
			contentType:           fileMimeType,
			keepOriginalExtension: true,
		});

		const fileUploadToken: FileUploadData = {
			path: uploadRes.url,
			mime: fileMimeType,
			name: data.fileName,
		};
		return response(200, {
			jwt: sign(fileUploadToken, jwtSecret),
		});
	}

	async addCaseDocument (params: FnParams<AddCaseDocumentInput>):
		Promise<EndpointResult<Message | ID_T>> {
		const data       = params.body;
		const caseAccess = await this.verifyCaseAccess(data.authToken, data.caseId);
		if (Array.isArray(caseAccess)) {
			return message(caseAccess[0], caseAccess[1]);
		}

		const jwtSecret = await this.common.getJwtSecret();
		const fileData  = verifyFileJwtToken(data.file.jwt, jwtSecret);

		const filePath          = shortenS3Url(fileData.path);
		const res: UpsertResult = await (await this.common.getPool()).execute(
			"INSERT INTO case_document (case_id, file_link, file_mime, file_name, description, uploaded_by_id) VALUES (?, ?, ?, ?, ?, ?)",
			[BigInt(data.caseId), filePath, fileData.mime, fileData.name, data.description, caseAccess.id]);

		const caseDocumentId = nn(res.insertId).toString();

		return response(constants.HTTP_STATUS_OK, caseDocumentId);
	}

	async getCaseDocuments (params: FnParams<GetCaseDocumentsInput>):
		Promise<EndpointResult<Message | CaseDocumentData[]>> {
		const data       = params.body;
		const caseAccess = await this.verifyCaseAccess(data.authToken, data.caseId);
		if (Array.isArray(caseAccess)) {
			return message(caseAccess[0], caseAccess[1]);
		}
		const res: Record<string, string | number | Date>[] = await (await this.common.getPool()).query(
			`SELECT cd.id  AS case_doc_id,
			        uploaded_on,
			        file_link,
			        file_mime,
			        file_name,
			        description,
			        uploaded_by_id,
			        u.name AS uploaded_by_name
			 FROM case_document         cd
			 JOIN "justice_firm"."user" u ON cd.uploaded_by_id = u.id
			 WHERE case_id = ?;`,
			[BigInt(data.caseId)],
		);
		const caseDocuments                                 = res?.map((value): CaseDocumentData => {
			return {
				id:          value.case_doc_id.toString(),
				description: value.description.toString(),
				file:        {
					path: unShortenS3Url(value.file_link.toString()),
					mime: value.file_mime.toString(),
					name: value.file_name?.toString(),
				},
				uploadedBy:  {
					id:   value.uploaded_by_id.toString(),
					name: value.uploaded_by_name.toString(),
				},
				uploadedOn:  value.uploaded_on.toString(),
			};
		}) ?? [];
		return response(200, caseDocuments);
	}

	private async insertSpecializationTypesWithConnection (specializationTypes: Array<ID_T>, userId: number | bigint, conn: PoolConnectionPatch) {
		let params = specializationTypes.map(value => ([BigInt(userId), value] as [bigint, string]));
		return await conn.batchInsert("lawyer_specialization", ["lawyer_id", "case_type_id"], params);
	}

	private async verifyCaseAccess (authToken: AuthToken, caseId: ID_T): Promise<PrivateAuthToken | [number, string]> {
		const jwtSecret = await this.common.getJwtSecret();
		const jwt       = verifyJwtToken(authToken.jwt, jwtSecret);
		if (jwt == null) {
			return [constants.HTTP_STATUS_UNAUTHORIZED, "Invalid auth token"];
		}

		const res: Record<string, any>[] = await (await this.common.getPool()).query(
			`SELECT s.lawyer_id, s.client_id
			 FROM "justice_firm"."case" S
			 WHERE S.id = ?;`, [BigInt(caseId)]);

		if (res.length === 0) {
			return [400, "No such case found"];
		}

		const value    = res[0];
		const lawyerId = value.lawyer_id?.toString();
		const clientId = value.client_id?.toString();
		if (lawyerId !== jwt.id && clientId !== jwt.id) {
			return [constants.HTTP_STATUS_UNAUTHORIZED, `User id ${jwt.id} is not allowed access the details of case ${caseId}`];
		}
		return jwt;
	}

	private extractAndParseLawyerAndClientData (value: Record<string, any>) {
		const lawyer: LawyerSearchResult = {
			id:                value.l_id.toString(),
			name:              value.l_name.toString(),
			email:             value.l_email.toString(),
			phone:             value.l_phone.toString(),
			address:           value.l_address.toString(),
			photoPath:         value.l_photo_path.toString(),
			gender:            value.l_gender?.toString(),
			latitude:          Number(value.l_latitude),
			longitude:         Number(value.l_longitude),
			certificationLink: value.l_certification_link.toString(),
			status:            nullOrEmptyCoalesce(value.l_status.toString(), StatusEnum.Waiting),
			rejectionReason:   value.l_rejection_reason?.toString(),
			distance:          undefined,
		} as LawyerSearchResult;
		const client: ClientDataResult   = {
			id:        value.c_id.toString(),
			name:      value.c_name.toString(),
			email:     value.c_email.toString(),
			phone:     value.c_phone.toString(),
			address:   value.c_address.toString(),
			photoPath: value.c_photo_path.toString(),
			gender:    value.c_gender?.toString(),
		} as ClientDataResult;
		return {lawyer, client};
	}

	private async getLoginResponse (email: string, password: string) {
		const jwtSecret = await this.common.getJwtSecret();

		const resSet = await (await this.common.getPool()).query(
			`SELECT id, name, password_hash, type
			 FROM "justice_firm"."user"
			 WHERE email = ?;`,
			[email],
		);

		if (resSet.length === 0) {
			return message(constants.HTTP_STATUS_UNAUTHORIZED, "Email not used to sign up a user");
		}
		const {password_hash: passwordHash, id, type, name} = resSet[0] as {
			id: number | bigint,
			password_hash: string,
			type: UserAccessType,
			name: string
		};
		if (!compareSync(password, passwordHash.toString())) {
			return false;
		}
		return generateAuthTokenResponse(id, type, jwtSecret, name.toString());
	}
}
