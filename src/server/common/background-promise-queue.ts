import isPromise from "is-promise";
import {Nuly} from "~~/src/common/utils/types";
import {uniqId} from "~~/src/common/utils/uniq-id";

async function logPromise<T> (p: Promise<T>, name: string) {
	try {
		const res = await p;
		console.log(`${name} returned result: `, res);
		return res;
	} catch (e) {
		console.trace(`${name} threw an error: `, e);
		return;
	}
}

export class BackgroundPromiseQueue {
	private promises: [Promise<unknown>, string][] = [];

	public add<T, S> (p: Promise<T> | S, name?: string | Nuly): void {
		if (!isPromise(p)) return;
		name ??= ("p-" + uniqId());
		this.promises.push([logPromise(Promise.resolve(p), name), name]);
	}

	public async waitForAll () {
		if (this.promises.length === 0) return;
		const promises = this.promises;
		this.promises  = [];
		return await Promise.all(promises.map(value => value[0]));
	}
}

export const pq = new BackgroundPromiseQueue();
