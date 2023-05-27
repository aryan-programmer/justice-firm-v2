import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {DeleteItemCommand, ReturnConsumedCapacity} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {createPool, Pool, PoolConnection} from "mariadb";
import {createClient} from "redis";
import {CONNECTION_ID} from "../common/infrastructure-constants";
import {nn} from "../common/utils/asserts";
import {Nuly} from "../common/utils/types";
import {
	connectionsTableName,
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
import {printConsumedCapacity} from "./utils/functions";
import {RedisCacheTagger} from "./utils/redis-cache-tagging";

const fakeRedisClient = true ? undefined as never : createClient({
	url:      `${REDIS_ENDPOINT}:${REDIS_PORT}`,
	username: REDIS_USERNAME,
	password: "",
});

export class CommonApiMethods {
	private pool: Pool | Nuly                            = null;
	private jwtSecret: string | Nuly                     = null;
	private redisCacheTagger: RedisCacheTagger | Nuly    = null;
	private redisClient: (typeof fakeRedisClient) | Nuly = null;

	async getJwtSecret (): Promise<string> {
		return this.jwtSecret ??= nn((await ssmClient.send(new GetParameterCommand({
			Name:           JWT_SECRET_PARAMETER_NAME,
			WithDecryption: true
		}))).Parameter?.Value);
	}

	async getConnection (): Promise<PoolConnection> {
		return await (await this.getPool()).getConnection();
	}

	async getPool (): Promise<Pool> {
		const connectionLimit = 3;
		if (this.pool == null) {
			const password = await ssmClient.send(new GetParameterCommand({
				Name:           DB_PASSWORD_PARAMETER_NAME,
				WithDecryption: true,
			}));
			return this.pool = createPool({
				host:           DB_ENDPOINT,
				port:           DB_PORT,
				user:           DB_USERNAME,
				password:       nn(password.Parameter).Value,
				database:       "justice_firm",
				acquireTimeout: 2500,
				// AWS RDS MariaDB can't create more than 5-6 for some reason
				connectionLimit:       connectionLimit,
				initializationTimeout: 1000,
				leakDetectionTimeout:  3000,
				idleTimeout:           0,
			});
		}
		console.log({
			active: this.pool.activeConnections(),
			idle:   this.pool.idleConnections(),
			total:  this.pool.totalConnections(),
			connectionLimit,
		});
		return this.pool;
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
