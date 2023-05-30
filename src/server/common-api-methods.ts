import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {DeleteItemCommand, ReturnConsumedCapacity} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {Pool, PoolClient, QueryResult} from "pg";
import {createClient} from "redis";
import {CONNECTION_ID} from "../common/infrastructure-constants";
import {assert, nn} from "../common/utils/asserts";
import {Nuly} from "../common/utils/types";
import {uniqId} from "../common/utils/uniq-id";
import {
	connectionsTableName,
	DB_DATABASE_NAME,
	DB_ENDPOINT,
	DB_PASSWORD_PARAMETER_NAME,
	DB_PORT,
	DB_USERNAME,
	dynamoDbClient,
	JWT_SECRET_PARAMETER_NAME,
	REDIS_ENDPOINT,
	REDIS_PASSWORD_PARAMETER_NAME,
	REDIS_PORT,
	REDIS_USERNAME,
	ssmClient
} from "./environment-clients";
import {cacheExpiryTimeMs} from "./utils/constants";
import {printConsumedCapacity, repeatedNTimesWithDelimiter, repeatedQuestionMarks} from "./utils/functions";
import {RedisCacheTagger} from "./utils/redis-cache-tagging";

const fakeRedisClient = true ? undefined as never : createClient({
	url:      `${REDIS_ENDPOINT}:${REDIS_PORT}`,
	username: REDIS_USERNAME,
	password: "",
});

export type UpsertResult = {
	affectedRows: number;
	insertId?: number | bigint;
	result: QueryResult
};

export type SelectResult = Record<string, any>[];

function wrapWithQuotesIfNot (s: string) {
	if (s.startsWith("\"")) return s;
	assert(!s.includes("\""), "Invalid identifier name");
	return `"${s}"`;
}

function queryPreprocessing (queryText: string) {
	const parts = queryText.split("?");
	if (parts.length === 1) return parts[0];
	let res = "";
	let i   = 0;
	for (const part of parts) {
		if (i === 0) res += part;
		else res += "$" + i + part;
		i++;
	}
	res = res.replace(/\s\s+/g, ' ');
	return res;
}

async function execQuery<I extends any[] = any[]> (
	runner: Pool | PoolClient,
	queryText: string,
	values?: I,
	idColumn: string = "id"
): Promise<SelectResult | UpsertResult> {
	let isSelect = false;
	let getId    = false;
	if (queryText.startsWith("SELECT")) {
		isSelect = true;
	} else if (queryText.startsWith("INSERT") && !queryText.includes("RETURNING")) {
		queryText = queryText.replace(";", "") + " RETURNING " + idColumn + ";";
		getId     = true;
	}
	queryText = queryPreprocessing(queryText);
	const res = await runner.query(queryText, values);
	if (isSelect) {
		return res.rows as Record<string, any>[];
	} else {
		return {
			affectedRows: res.rowCount,
			result:       res,
			insertId:     getId ? BigInt(((res.rows[0] as Record<string, any>)[idColumn].toString() ?? "0") as string) : undefined
		};
	}
}

export class PoolConnectionPatch {
	constructor (public client: PoolClient) {
	}

	async beginTransaction () {
		return await this.client.query("BEGIN");
	}

	async commit () {
		return await this.client.query("COMMIT");
	}

	async rollback () {
		return await this.client.query("ROLLBACK");
	}

	async release () {
		await this.client.release();
	}

	async execute<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<UpsertResult> {
		queryText = queryText.trim();
		if (queryText.startsWith("SELECT")) {
			throw new Error("Execute queries can not start with SELECT");
		}
		return (await execQuery(this.client, queryText, values, idColumn)) as UpsertResult;
	}

	async query<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<SelectResult> {
		queryText = queryText.trim();
		if (!queryText.startsWith("SELECT")) {
			throw new Error("Queries must start with SELECT");
		}
		return (await execQuery(this.client, queryText, values, idColumn)) as SelectResult;
	}

	async batchInsert<I extends any[][] = any[][]> (
		tableName: string,
		columnNames: string[],
		values: I
	) {
		if (values.length === 0) return;
		assert(values.every(v => v.length === columnNames.length),
			"The number of values in each row to insert must match the number of columns");
		tableName               = wrapWithQuotesIfNot(tableName);
		columnNames             = columnNames.map(wrapWithQuotesIfNot)
		const valuesPlaceholder = repeatedNTimesWithDelimiter(
			`(${repeatedQuestionMarks(columnNames.length)})`,
			',',
			values.length
		);
		let insertQuery         = `INSERT INTO ${tableName} (${columnNames.join(",")}) VALUES ${valuesPlaceholder};`;
		insertQuery             = queryPreprocessing(insertQuery);
		const flatValues        = values.flat(1);
		console.log({insertQuery, flatValues});
		return await this.client.query(insertQuery, flatValues);
	}

	async batchUpdate (
		tableName: string,
		idName: string,
		idType: string,
		columnNames: string[],
		columnTypes: string[],
		values: {
			id: any,
			values: any[]
		}[]
	) {
		if (values.length === 0) return;
		assert(values.every(v => v.values.length === columnNames.length),
			"The number of values in each row to insert must match the number of columns");
		const origTableName       = wrapWithQuotesIfNot("orig_" + uniqId());
		const tempTableName       = wrapWithQuotesIfNot("temp_vals_" + uniqId());
		tableName                 = wrapWithQuotesIfNot(tableName);
		idName                    = wrapWithQuotesIfNot(idName);
		columnNames               = columnNames.map(wrapWithQuotesIfNot);
		const valuesPlaceholders  = "VALUES " + repeatedNTimesWithDelimiter(
			`(?::${idType.toUpperCase()}, ${columnTypes.map(v => `?::${v.toUpperCase()}`)})`,
			',',
			values.length
		);
		const columnsForSetClause = columnNames.map(v => `${v}=${tempTableName}.${v}`).join(",");
		let updateQuery           =
			    `UPDATE ${tableName} AS ${origTableName}
			     SET ${columnsForSetClause}
			     FROM (${valuesPlaceholders}) AS ${tempTableName}(${idName}, ${columnNames.join(",")})
			     WHERE ${tempTableName}.${idName} = ${origTableName}.${idName};`;
		updateQuery               = queryPreprocessing(updateQuery);
		const flatValues          = values.flatMap(v => [v.id, ...v.values]);
		console.log({updateQuery, flatValues});
		return await this.client.query(updateQuery, flatValues);
	}
}

export class PoolPatch {
	constructor (public pool: Pool) {
	}

	async execute<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<UpsertResult> {
		queryText = queryText.trim();
		if (queryText.startsWith("SELECT")) {
			throw new Error("Execute queries can not start with SELECT");
		}
		return (await execQuery(this.pool, queryText, values, idColumn)) as UpsertResult;
	}

	async query<I extends any[] = any[]> (
		queryText: string,
		values?: I,
		idColumn: string = "id"
	): Promise<SelectResult> {
		queryText = queryText.trim();
		if (!queryText.startsWith("SELECT")) {
			throw new Error("Queries must start with SELECT");
		}
		return (await execQuery(this.pool, queryText, values, idColumn)) as SelectResult;
	}
}

export class CommonApiMethods {
	private pool: Pool | Nuly                            = null;
	private poolPatch: PoolPatch | Nuly                  = null;
	private jwtSecret: string | Nuly                     = null;
	private redisCacheTagger: RedisCacheTagger | Nuly    = null;
	private redisClient: (typeof fakeRedisClient) | Nuly = null;

	async getJwtSecret (): Promise<string> {
		return this.jwtSecret ??= nn((await ssmClient.send(new GetParameterCommand({
			Name:           JWT_SECRET_PARAMETER_NAME,
			WithDecryption: true
		}))).Parameter?.Value);
	}

	async getConnection () {
		return new PoolConnectionPatch(await (await this.getPool()).pool.connect());
	}

	async getPool (): Promise<PoolPatch> {
		const connectionLimit = 5;
		if (this.pool == null) {
			const password = await ssmClient.send(new GetParameterCommand({
				Name:           DB_PASSWORD_PARAMETER_NAME,
				WithDecryption: true,
			}));
			this.pool      = new Pool({
				host:              DB_ENDPOINT,
				port:              DB_PORT,
				user:              DB_USERNAME,
				password:          nn(password.Parameter).Value,
				database:          DB_DATABASE_NAME,
				min:               1,
				max:               connectionLimit,
				maxUses:           connectionLimit,
				idleTimeoutMillis: 60000,
				allowExitOnIdle:   false,
				keepAlive:         true,
				ssl:               true,
			});
		}
		if (this.poolPatch == null) {
			this.poolPatch = new PoolPatch(this.pool!);
		}
		console.log({
			waiting: this.pool!.waitingCount,
			idle:    this.pool!.idleCount,
			total:   this.pool!.totalCount,
			connectionLimit,
			pool:    this.pool,
		});
		return this.poolPatch!;
	}

	async getRedisClient () {
		if (this.redisClient == null) {
			const password   = await ssmClient.send(new GetParameterCommand({
				Name:           REDIS_PASSWORD_PARAMETER_NAME,
				WithDecryption: true,
			}));
			const options    = {
				socket:   {
					host: REDIS_ENDPOINT,
					port: REDIS_PORT
				},
				username: REDIS_USERNAME,
				password: nn(password.Parameter).Value,
			};
			this.redisClient = createClient(options);
			await this.redisClient!.connect();
			return this.redisClient;
		}
		return this.redisClient;
	}

	async getRedisCacheTagger () {
		return this.redisCacheTagger ??= new RedisCacheTagger(await this.getRedisClient());
	}

	async deleteConnection (conn: string) {
		const deleteResponse = await dynamoDbClient.send(new DeleteItemCommand({
			TableName:              connectionsTableName,
			Key:                    {
				[CONNECTION_ID]: {S: conn}
			},
			ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("deleteConnection", deleteResponse);
	}

	async onAllConnections (conns: string[], predicate: (conn: string) => Promise<void>) {
		if (conns.length === 0) return;
		await Promise.all(conns.map(async conn => {
			try {
				await predicate(conn);
			} catch (ex) {
				if (ex instanceof GoneException) {
					console.log({GoneException: ex});
					await this.deleteConnection(conn);
				} else {
					console.log({ex});
				}
			}
		}));
	}

	async cacheResult<T> (
		name: string,
		fn: () => Promise<T>,
		options?: {
			expiryTimeMs?: number | Nuly,
			forceRecompute?: boolean | Nuly,
		}
	): Promise<T> {
		let {expiryTimeMs, forceRecompute} = options ?? {};

		expiryTimeMs ??= cacheExpiryTimeMs;
		forceRecompute ??= false;
		const cache = await this.getRedisClient();
		const key   = name;
		let res: string | null;
		if (forceRecompute || (res = await cache.get(key)) == null) {
			const newRes = await fn();
			if (forceRecompute) {
				console.log({message: `Forced recompute on ${name} with result: `, res: newRes});
			} else {
				console.log({message: `Computed ${name} with result and placing in cache.`, res: newRes});
			}
			if (newRes != null) {
				const str = JSON.stringify(newRes, undefined, 0);
				await cache.set(key, str, expiryTimeMs != null ? {
					PX: expiryTimeMs
				} : {});
			}
			return newRes;
		}
		console.log("Obtained ", name, " from cache ", res);
		return JSON.parse(res) as T;
	}

	NOT_CACHE_RESULT<T> (
		name: string,
		fn: () => Promise<T>,
		options?: {
			expiryTimeMs?: number | Nuly,
			forceRecompute?: boolean | Nuly,
		}
	): Promise<T> {
		return fn();
	}
}
