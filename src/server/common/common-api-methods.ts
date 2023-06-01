import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {DeleteItemCommand, ReturnConsumedCapacity} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import {createClient} from "redis";
import {CONNECTION_ID} from "../../common/infrastructure-constants";
import {nn} from "../../common/utils/asserts";
import {Nuly} from "../../common/utils/types";
import {
	connectionsTableName,
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

const fakeRedisClient = true ? undefined as never : createClient({
	url:      `${REDIS_ENDPOINT}:${REDIS_PORT}`,
	username: REDIS_USERNAME,
	password: "",
});

export class CommonApiMethods {
	private jwtSecret: string | Nuly                     = null;
	// private redisCacheTagger: RedisCacheTagger | Nuly    = null;
	private redisClient: (typeof fakeRedisClient) | Nuly = null;

	async getJwtSecret (): Promise<string> {
		return this.jwtSecret ??= nn((await ssmClient.send(new GetParameterCommand({
			Name:           JWT_SECRET_PARAMETER_NAME,
			WithDecryption: true
		}))).Parameter?.Value);
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

	// async getRedisCacheTagger () {
	// 	return this.redisCacheTagger ??= new RedisCacheTagger(await this.getRedisClient());
	// }

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
