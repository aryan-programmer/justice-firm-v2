import {
	AppointmentBareData,
	CaseBareData,
	CaseType,
	ClientDataResult,
	LawyerSearchResult,
	LawyerStatistics,
	StatusEnum,
	StatusSearchOptions,
	StatusSearchOptionsEnum
} from "../common/db-types";
import {filterMap} from "../common/utils/array-methods/filterMap";
import {radiusOfEarthInKm} from "../common/utils/constants";
import {deg2rad, isNullOrEmpty, nullOrEmptyCoalesce, toNumIfNotNull} from "../common/utils/functions";
import {Nuly} from "../common/utils/types";
import {CommonApiMethods} from "./common-api-methods";
import {cacheExpiryTimeMs} from "./utils/constants";
import {getSqlTupleForInOperator} from "./utils/functions";

const baseLawyerColumns = "u.id, u.name, u.email, u.phone, u.address, u.photo_path, u.gender, l.latitude, l.longitude, l.certification_link, l.status, l.rejection_reason";

function LAWYER_DATA (id: string) {
	return `lawyer:${id}`;
}

function LAWYER_CASE_SPECIALIZATIONS (id: string) {
	return `lawyer:${id}:case-specializations`;
}

function LAWYER_BARE_APPOINTMENTS (id: string) {
	return `lawyer:${id}:bare-appointments`;
}

function LAWYER_BARE_CASES (id: string) {
	return `lawyer:${id}:bare-cases`;
}

function retTrue () {
	return true
}

function retTrueOnNotConfirmed (v: { status: StatusEnum }) {
	return v.status !== StatusEnum.Confirmed;
}

function retTrueOnNotRejected (v: { status: StatusEnum }) {
	return v.status !== StatusEnum.Rejected;
}

function retTrueOnNotWaiting (v: { status: StatusEnum }) {
	return v.status !== StatusEnum.Waiting;
}

function retTrueOnConfirmed (v: { status: StatusEnum }) {
	return v.status === StatusEnum.Confirmed;
}

function retTrueOnRejected (v: { status: StatusEnum }) {
	return v.status === StatusEnum.Rejected;
}

function retTrueOnWaiting (v: { status: StatusEnum }) {
	return v.status === StatusEnum.Waiting;
}

function getStatusFilterFunction (status: StatusSearchOptions): (v: { status: StatusEnum }) => boolean {
	switch (status) {
	case StatusSearchOptionsEnum.Any:
		return retTrue;
	case StatusSearchOptionsEnum.NotConfirmed:
		return retTrueOnNotConfirmed;
	case StatusSearchOptionsEnum.NotRejected:
		return retTrueOnNotRejected;
	case StatusSearchOptionsEnum.NotWaiting:
		return retTrueOnNotWaiting;
	case StatusEnum.Confirmed:
		return retTrueOnConfirmed;
	case StatusEnum.Rejected:
		return retTrueOnRejected;
	case StatusEnum.Waiting:
		return retTrueOnWaiting;
	default:
		return retTrue;
	}
}

function getSqlWhereAndClauseFromStatus (status: StatusSearchOptions): {
	statusWherePart: string,
	statusQueryArray: [StatusSearchOptions] | []
} {
	switch (status) {
	case StatusSearchOptionsEnum.Any:
		return {
			statusWherePart:  " 1 = 1 ",
			statusQueryArray: []
		};
	case StatusSearchOptionsEnum.NotConfirmed:
		return {
			statusWherePart:  " l.status != ? ",
			statusQueryArray: [StatusEnum.Confirmed]
		};
	case StatusSearchOptionsEnum.NotRejected:
		return {
			statusWherePart:  " l.status != ? ",
			statusQueryArray: [StatusEnum.Rejected]
		};
	case StatusSearchOptionsEnum.NotWaiting:
		return {
			statusWherePart:  " l.status != ? ",
			statusQueryArray: [StatusEnum.Waiting]
		};
	default:
		return {
			statusWherePart:  " l.status = ? ",
			statusQueryArray: [status]
		};
	}
}

export class DbModelMethods extends CommonApiMethods {
	constructor () {
		super();
	}

	public async invalidateLawyerCache (
		id: string | string[],
		options?: {
			invalidateCaseSpecializations?: boolean | Nuly,
		}) {
		const client                        = await this.getRedisClient();
		const invalidateCaseSpecializations = options?.invalidateCaseSpecializations === true;
		if (invalidateCaseSpecializations && typeof id === "string") {
			await client.del(LAWYER_DATA(id));
		} else {
			const vs             = typeof id === "string" ? [id] : id;
			const args: string[] = vs.map(LAWYER_DATA);
			if (invalidateCaseSpecializations) {
				args.push(...vs.map(LAWYER_CASE_SPECIALIZATIONS))
			}
			await client.del(args);
		}
	}

	public async getLawyerData (
		id: string,
		options?: {
			getStatistics?: boolean | Nuly,
			getCaseSpecializations?: boolean | Nuly,
			getBareAppointments?: boolean | Nuly,
			getBareCases?: boolean | Nuly,
			forceRefetch?: boolean | Nuly
		}
	) {
		let {
			    getStatistics,
			    getCaseSpecializations,
			    getBareAppointments,
			    getBareCases,
			    forceRefetch
		    }      = options ?? {};
		getStatistics ??= false;
		getCaseSpecializations ??= false;
		getBareAppointments ??= false;
		getBareCases ??= false;
		forceRefetch ??= false;
		const pool = await this.getPool();

		const lawyer: LawyerSearchResult | Nuly = await this.cacheResult(LAWYER_DATA(id), async () => {
			const res: Record<string, any>[] = await pool.execute(
				`SELECT ${baseLawyerColumns}
				 FROM lawyer l
				 JOIN user   u ON u.id = l.id
				 WHERE l.id = ?;`, [id]);
			if (res.length === 0) {
				return null;
			}
			return DbModelMethods.recordToLawyerSearchResult(res[0], false);
		}, {forceRecompute: forceRefetch});

		if (lawyer == null) {
			return null;
		}

		if (getCaseSpecializations) {
			lawyer.caseSpecializations = await this.cacheResult(LAWYER_CASE_SPECIALIZATIONS(id), async () => {
				const res: Record<string, any>[] = await pool.execute(
					`SELECT ct.id,
					        ct.name
					 FROM lawyer_specialization ls
					 JOIN case_type             ct
					      ON ct.id = ls.case_type_id
					 WHERE ls.lawyer_id = ?;`, [id]);
				return res.map(value => ({
					id:   value.id.toString(),
					name: value.name.toString(),
				} as CaseType));
			}, {forceRecompute: forceRefetch});
		}

		if (getStatistics) {
			lawyer.statistics = await this.NOT_CACHE_RESULT(`lawyer:${id}:statistics`, async () => {
				const res: Record<string, any>[] = await pool.execute(
					`SELECT las.rejected_appointments,
					        las.waiting_appointments,
					        las.confirmed_appointments,
					        las.total_appointments,
					        lcs.total_cases,
					        lcs.total_clients
					 FROM lawyer_appointment_statistics las
					 JOIN lawyer_case_statistics        lcs ON las.lawyer_id = lcs.lawyer_id
					 WHERE las.lawyer_id = ?;`, [id]);
				if (res.length === 0) {
					return null;
				}
				return DbModelMethods.recordToLawyerStatistics(res[0]);
			}, {forceRecompute: forceRefetch});
		}

		if (getBareAppointments) {
			lawyer.appointments = await this.NOT_CACHE_RESULT(LAWYER_BARE_APPOINTMENTS(id), async () => {
				const res: Record<string, any>[] = await pool.execute(
					`SELECT a.id,
					        a.client_id AS oth_id,
					        cu.name     AS oth_name,
					        a.case_id,
					        a.status,
					        a.opened_on,
					        a.timestamp
					 FROM appointment a
					 JOIN user        cu ON a.client_id = cu.id
					 WHERE a.lawyer_id = ?;`, [BigInt(lawyer.id)]);
				return res.map(value => ({
					id:        value.id.toString(),
					othId:     value.oth_id.toString(),
					othName:   value.oth_name.toString(),
					caseId:    value.case_id?.toString(),
					timestamp: value.timestamp?.toString(),
					openedOn:  value.opened_on.toString(),
					status:    value.status.toString(),
				} as AppointmentBareData));
			}, {forceRecompute: forceRefetch});
		}

		if (getBareCases) {
			lawyer.cases = await this.NOT_CACHE_RESULT(LAWYER_BARE_CASES(id), async () => {
				const res: Record<string, any>[] = await pool.execute(
					`SELECT c.id,
					        c.client_id AS oth_id,
					        cu.name     AS oth_name,
					        c.type_id   AS type_id,
					        ct.name     AS type_name,
					        c.status,
					        c.opened_on
					 FROM \`case\`  c
					 JOIN user      cu ON c.client_id = cu.id
					 JOIN case_type ct ON c.type_id = ct.id
					 WHERE c.lawyer_id = ?;`, [BigInt(lawyer.id)]);
				return res.map(value => ({
					id:       value.id.toString(),
					othId:    value.oth_id.toString(),
					othName:  value.oth_name.toString(),
					openedOn: value.opened_on.toString(),
					status:   value.status.toString(),
					caseType: {
						id:   value.type_id.toString(),
						name: value.type_name.toString(),
					}
				} as CaseBareData));
			}, {forceRecompute: forceRefetch});
		}

		return lawyer;
	}

	public async searchAllLawyers (
		options: {
			name: string,
			email: string,
			address: string,
			status: StatusSearchOptions,
			getStatistics?: boolean | Nuly,
			forceRefetch?: boolean | Nuly,
			coords?: {
				         latitude: number,
				         longitude: number,
			         } | Nuly
		}
	) {
		const pool  = await this.getPool();
		const cache = await this.getRedisClient();

		let {
			    getStatistics,
			    name,
			    address,
			    email,
			    status,
			    forceRefetch,
			    coords,
		    }        = options ?? {};
		getStatistics ??= false;
		forceRefetch = (forceRefetch ?? false);
		name         = `%${name}%`;
		address      = `%${address}%`;
		email        = `%${email}%`;

		/*`SELECT id
	 FROM user
	 WHERE type = 'lawyer'
	   AND MATCH (name) AGAINST ( ? IN BOOLEAN MODE )
	   AND MATCH (email) AGAINST ( ? IN BOOLEAN MODE )
	   AND MATCH (address) AGAINST ( ? IN BOOLEAN MODE );`*/
		const queryResults: Record<string, any>[] = await pool.query(
			"SELECT id FROM user WHERE name LIKE ? AND email LIKE ? AND address LIKE ? AND type = 'lawyer'",
			[name, email, address]);

		const ids = filterMap(queryResults, value => value?.id?.toString() as string | Nuly);

		if (ids.length === 0) return [];

		let needToFetchIds: string[];
		let lawyersByStatus: LawyerSearchResult[] | Nuly = null;
		if (forceRefetch) {
			console.log({message: "Forcing re-fetch for ids ", ids});
			needToFetchIds = ids;
		} else {
			const statusFilterFunction                 = getStatusFilterFunction(status);
			const cachedDataResults: (string | Nuly)[] = await cache.mGet(ids.map(LAWYER_DATA));
			needToFetchIds                             = [];
			lawyersByStatus                            = filterMap(cachedDataResults, (cacheData, i) => {
				let parse: LawyerSearchResult | Nuly;
				if (isNullOrEmpty(cacheData) || (parse = JSON.parse(cacheData)) == null) {
					needToFetchIds.push(ids[i]);
					return null;
				}
				if (!statusFilterFunction(parse)) {
					return null;
				}
				return parse;
			});
			console.log({message: "Got lawyers from cache: ", lawyersByStatus});
		}
		console.log(needToFetchIds.length, needToFetchIds);
		if (needToFetchIds.length > 0) {
			const {statusWherePart, statusQueryArray}  = getSqlWhereAndClauseFromStatus(status);
			const sqlRes: Record<string, any>[]        = await pool.execute(
				`SELECT ${baseLawyerColumns}
				 FROM lawyer l
				 JOIN user   u ON u.id = l.id
				 WHERE l.id IN (${getSqlTupleForInOperator(needToFetchIds.length)})
				   AND ${statusWherePart};`,
				[...needToFetchIds.map(BigInt), ...statusQueryArray]);
			const lawyersFromSql: LawyerSearchResult[] = sqlRes.map((v) => DbModelMethods.recordToLawyerSearchResult(v));
			const multi                                = await cache.multi();
			for (const lawyer of lawyersFromSql) {
				multi.set(LAWYER_DATA(lawyer.id), JSON.stringify(lawyer, null, 0), {
					PX: cacheExpiryTimeMs
				});
			}
			await multi.exec();

			console.log({message: "Placed in cache: ", lawyersFromSql});

			if (lawyersByStatus == null) lawyersByStatus = lawyersFromSql;
			else
				lawyersByStatus.push(...lawyersFromSql);
		}

		lawyersByStatus ??= [];

		if (coords != null) {
			const {latitude: lat1, longitude: lon1} = coords;
			const cosOfDegToRadOfLat1               = Math.cos(deg2rad(lat1));
			for (const lawyer of lawyersByStatus) {
				const {latitude: lat2, longitude: lon2} = lawyer;

				const dLat      = deg2rad(lat2 - lat1);
				const dLon      = deg2rad(lon2 - lon1);
				const a         =
					      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
					      cosOfDegToRadOfLat1 * Math.cos(deg2rad(lat2)) *
					      Math.sin(dLon / 2) * Math.sin(dLon / 2);
				const c         = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
				lawyer.distance = radiusOfEarthInKm * c;
			}
			lawyersByStatus = lawyersByStatus.sort((a, b) => a.distance! - b.distance!);
		}

		if (getStatistics) {
			const statsRes: Record<string, any>[] = await pool.query(
				`SELECT las.rejected_appointments,
				        las.waiting_appointments,
				        las.confirmed_appointments,
				        las.total_appointments,
				        lcs.total_cases,
				        lcs.total_clients
				 FROM lawyer_appointment_statistics las
				 JOIN lawyer_case_statistics        lcs ON las.lawyer_id = lcs.lawyer_id
				 WHERE lcs.lawyer_id IN (${getSqlTupleForInOperator(lawyersByStatus.length)})`,
				lawyersByStatus.map(value => BigInt(value.id)));
			for (let i = 0; i < lawyersByStatus.length; i++) {
				const lawyer: LawyerSearchResult = lawyersByStatus[i];
				lawyer.statistics                = DbModelMethods.recordToLawyerStatistics(statsRes[i]);
			}
		}

		return lawyersByStatus;
	}

	public static recordToClientData (value: Record<string, any>): ClientDataResult {
		return {
			id:        value.id.toString(),
			name:      value.name.toString(),
			email:     value.email.toString(),
			phone:     value.phone.toString(),
			address:   value.address.toString(),
			photoPath: value.photo_path.toString(),
			gender:    value.gender?.toString(),
		}
	}

	public static recordToLawyerSearchResult (value: Record<string, any>, extractStatistics: boolean = false) {
		const stats: LawyerStatistics | Nuly = extractStatistics ? this.recordToLawyerStatistics(value) : undefined;
		return {
			...DbModelMethods.recordToClientData(value),
			latitude:          Number(value.latitude),
			longitude:         Number(value.longitude),
			certificationLink: value.certification_link.toString(),
			status:            nullOrEmptyCoalesce(value.status?.toString(), StatusEnum.Waiting),
			distance:          toNumIfNotNull(value.distance),
			rejectionReason:   nullOrEmptyCoalesce(value.rejection_reason?.toString(), undefined),
			statistics:        stats,
		} as LawyerSearchResult;
	}

	private static recordToLawyerStatistics (value: Record<string, any>) {
		return {
			rejectedAppointments:  toNumIfNotNull(value.rejected_appointments) ?? 0,
			waitingAppointments:   toNumIfNotNull(value.waiting_appointments) ?? 0,
			confirmedAppointments: toNumIfNotNull(value.confirmed_appointments) ?? 0,
			totalAppointments:     toNumIfNotNull(value.total_appointments) ?? 0,
			totalCases:            toNumIfNotNull(value.total_cases) ?? 0,
			totalClients:          toNumIfNotNull(value.total_clients) ?? 0,
		};
	}
}
