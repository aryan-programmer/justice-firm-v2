export function dateToDynamoDbStr (d: Date) {
	return d.getTime().toString(10);
}

export function strToDate (d: string) {
	const n = +d;
	if (isNaN(n)) {
		return new Date(d);
	} else {
		return new Date(n);
	}
}
