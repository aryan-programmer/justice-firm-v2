import {RedisCommandArgument, RedisModules} from "@redis/client/dist/lib/commands";
import {RedisClientType, RedisFunctions, RedisScripts} from "redis";
import {Nuly} from "../../common/utils/types";
import {cacheExpiryTimeMs} from "./constants";

export type RedisCacheTaggerOptions = {
	valuesTtlMs: number | Nuly,
	keyPrefix: string,
	tagPrefix: string,
};

export type RedisCacheTaggerMethodOptions = Partial<Omit<RedisCacheTaggerOptions, "keyPrefix" | "tagPrefix">>;

const defaultOptions: RedisCacheTaggerOptions = {
	keyPrefix:   "k:",
	tagPrefix:   "t:",
	valuesTtlMs: cacheExpiryTimeMs,
};

export class RedisCacheTagger<CacheData = any> {
	options: RedisCacheTaggerOptions;

	constructor (private client: RedisClientType<RedisModules, RedisFunctions, RedisScripts>, options?: Partial<RedisCacheTaggerOptions>) {
		this.options = {...defaultOptions, ...options};
	}

	async get (key: RedisCommandArgument): Promise<CacheData | Nuly> {
		const res = await this.client.mGet([this.options.keyPrefix + key.toString()]);
		return res[0] != null ? JSON.parse(res[0]) : null;
	}

	async set (
		key: string,
		data: CacheData,
		tags: Array<string>,
		options?: RedisCacheTaggerMethodOptions
	): Promise<void> {
		const {tagPrefix, valuesTtlMs: timeout} = options == null ? this.options : {...this.options, ...options};
		try {
			const kv    = this.options.keyPrefix + key.toString();
			const multi = await this.client.multi();

			// Add the key to each of the tag sets
			for (const tag of tags) {
				multi.sAdd(tagPrefix + tag, key);
			}

			if (typeof timeout === 'number') {
				multi.set(kv, JSON.stringify(data), {PX: timeout});
			} else {
				multi.set(kv, JSON.stringify(data));
			}
			await multi.exec();
			return;
		} catch (err) {
			return Promise.reject(err);
		}
	}

	async invalidate (...tags: Array<string>): Promise<void> {
		const {tagPrefix, keyPrefix} = this.options;
		try {
			const keys     = (await Promise.all(tags.map(tag => this.client.sMembers(tagPrefix + tag)))).flat();
			const pipeline = await this.client.multi();

			for (const key of keys) {
				pipeline.del(keyPrefix + key);
			}

			for (const tag of tags) {
				pipeline.del(tagPrefix + tag);
			}

			await pipeline.exec();
		} catch (err) {
			throw err;
		}
	};
}
