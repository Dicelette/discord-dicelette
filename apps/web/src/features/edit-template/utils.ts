export function isNumber(value: unknown): boolean {
	if (value === null || value === undefined || value === "") return false;
	return !Number.isNaN(Number(value));
}

export function under(value: unknown, threshold: number): boolean {
	if (!isNumber(value)) return false;
	return Number(value) < threshold;
}
