export function removeProxies (value: any) {
	return JSON.parse(JSON.stringify(value, null, 4));
}

export function prettyString (value: any) {
	return JSON.stringify(value, null, 4);
}

export function printRemoveProxies (...vs: any[]) {
	console.log(...vs.map(value => typeof value === "object" ? JSON.parse(JSON.stringify(value, null, 4)) : value));
}

export function prettyPrint (...vs: any[]) {
	console.log(...vs.map(value => typeof value === "object" ? JSON.stringify(value, null, 4) : value));
}
