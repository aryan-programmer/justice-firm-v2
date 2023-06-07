import {GoneException} from "@aws-sdk/client-apigatewaymanagementapi";
import {DeleteItemCommand, QueryCommand, ReturnConsumedCapacity, Select} from "@aws-sdk/client-dynamodb";
import {GetParameterCommand} from "@aws-sdk/client-ssm";
import pMap from "p-map";
import {createClient} from "redis";
import {filterMap} from "~~/src/common/utils/array-methods/filterMap";
import {
	CONNECTION_GROUP_ID,
	CONNECTION_ID,
	connectionsByGroupIdIndex,
	ConnectionsTable_ExpressionAttributeNames
} from "../../common/infrastructure-constants";
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
		if (conns.length === 0) return 0;
		return (await pMap(conns, async conn => {
			try {
				await predicate(conn);
				return 1;
			} catch (ex) {
				if (ex instanceof GoneException) {
					console.log({GoneException: ex});
					await this.deleteConnection(conn);
				} else {
					console.log({ex});
				}
			}
			return 0;
		})).reduce((a: number, b: number) => a + b, 0 as number);
	}

	async sendToGroup (groupId: string, predicate: (conn: string) => Promise<void>) {
		const queryResponse = await dynamoDbClient.send(new QueryCommand({
			TableName:                 connectionsTableName,
			IndexName:                 connectionsByGroupIdIndex,
			ProjectionExpression:      `#${CONNECTION_ID}`,
			KeyConditionExpression:    `#${CONNECTION_GROUP_ID} = :needGroupId`,
			ExpressionAttributeNames:  ConnectionsTable_ExpressionAttributeNames,
			ExpressionAttributeValues: {
				":needGroupId": {S: groupId},
			},
			Select:                    Select.SPECIFIC_ATTRIBUTES,
			ReturnConsumedCapacity:    ReturnConsumedCapacity.INDEXES
		}));
		printConsumedCapacity("sendToGroup: Connections", queryResponse);
		const conns = filterMap(queryResponse.Items, value => value?.[CONNECTION_ID]?.S?.toString());
		return await this.onAllConnections(conns, predicate);
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
