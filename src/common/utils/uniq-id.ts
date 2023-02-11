function* generator () {
	let i = 0;
	while (true) {
		// "f".repeat(11) as time is Mon Jun 23 2527 11:50:44 GMT+0530 (India Standard Time)

		const timeHex = Date.now().toString(16).padStart(11, "0");
		const iHex    = (++i).toString(16).padStart(2, "0");
		const randHex = Math.random().toString(16).slice(2, 10);
		yield iHex + timeHex + randHex;
	}
	// noinspection UnreachableCodeJS
	return ""; // eslint-disable-line no-unreachable
}

const gen = generator();

export function uniqId (): string {
	return gen.next().value;
}
