export function LAWYER_DATA (id: string) {
	return `lawyer:${id}`;
}

export function LAWYER_CASE_SPECIALIZATIONS (id: string) {
	return `lawyer:${id}:case-specializations`;
}

export function LAWYER_BARE_APPOINTMENTS (id: string) {
	return `lawyer:${id}:bare-appointments`;
}

export function LAWYER_BARE_CASES (id: string) {
	return `lawyer:${id}:bare-cases`;
}
