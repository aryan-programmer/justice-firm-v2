export function partialSum<T, U> (
	arr: T[],
	callbackfn: (prev: U, curr: T, i: number, arr: T[]) => U,
	init: U,
	includeInitial: boolean = false
): U[] {
	const res: U[] = [];
	let v          = init;
	if (includeInitial) res.push(v);
	for (let i = 0; i < arr.length; i++) {
		res.push(v = callbackfn(v, arr[i], i, arr));
	}
	return res;
}
