import {Nuly} from "../../common/utils/types";
import {CommonApiMethods} from "./common-api-methods";
import {LAWYER_CASE_SPECIALIZATIONS, LAWYER_DATA} from "./redis-cache-tag-names";

export class RedisCacheModel extends CommonApiMethods {
	public async invalidateLawyerCache (
		id: string | string[],
		options?: {
			invalidateCaseSpecializations?: boolean | Nuly,
		}) {
		const client                        = await this.getRedisClient();
		const invalidateCaseSpecializations = options?.invalidateCaseSpecializations === true;
		if (!invalidateCaseSpecializations && typeof id === "string") {
			const res = await client.del(LAWYER_DATA(id));
			console.log("Deleted: " + res + " keys");
		} else {
			const vs             = typeof id === "string" ? [id] : id;
			const args: string[] = vs.map(LAWYER_DATA);
			if (invalidateCaseSpecializations) {
				args.push(...vs.map(LAWYER_CASE_SPECIALIZATIONS));
			}
			const res = await client.del(args);
			console.log("Deleted: " + res + " keys");
		}
	}
}
