const UNITS = [
	["h", 60 * 60 * 1000],
	["min", 60 * 1000],
	["s", 1000],
	["ms", 1],
] as const;

export function humanizeDuration(ms: number, maxUnits = 2): string {
	if (ms === 0) return "0ms";

	const sign = ms < 0 ? "-" : "";
	let remaining = Math.abs(ms);

	const parts: string[] = [];

	for (const [label, value] of UNITS) {
		if (remaining < value) continue;

		const count = Math.floor(remaining / value);
		remaining -= count * value;

		parts.push(count + label);

		if (parts.length >= maxUnits) break;
	}

	return sign + parts.join(" ");
}
