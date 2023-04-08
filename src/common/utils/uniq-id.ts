function* generator () {
	let i = 0;
	while (true) {
		const timeHex = Date.now().toString(36).padStart(8, "0");
		const iHex    = (++i).toString(36).padStart(2, "0");
		const randHex = Math.random().toString(36).slice(2, 5);
		yield iHex + timeHex + randHex;
	}
	// noinspection UnreachableCodeJS
	return ""; // eslint-disable-line no-unreachable
}

const gen = generator();

export function uniqId (): string {
	return gen.next().value;
}
