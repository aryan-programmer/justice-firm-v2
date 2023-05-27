export function filterMap<T, TResult> (array: T[] | null | undefined, iteratee: (value: T, index: number, collection: T[]) => TResult): NonNullable<TResult>[] {
	if (array == null || array.length === 0) return [];
	const result = [] as NonNullable<TResult>[];
	for (let i = 0; i < array.length; i++) {
		const value = array[i];
		const res   = iteratee(value, i, array);
		if (res != null) {
			result.push(res);
		}
	}
	return result;
}
