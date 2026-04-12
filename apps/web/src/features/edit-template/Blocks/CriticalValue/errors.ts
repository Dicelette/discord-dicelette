import type { CriticalValues } from "../../interfaces";

type CriticalErrorKey =
	| "template.errors.critical.sameValues"
	| "template.errors.critical.negative";

export function criticalErrorMessage(
	values: CriticalValues,
	type: "failure" | "success"
): CriticalErrorKey | null {
	const s = values.success?.toString() ?? "";
	const f = values.failure?.toString() ?? "";
	const sNum = Number(s);
	const fNum = Number(f);

	if (s !== "" && f !== "" && fNum === sNum && fNum >= 0 && sNum >= 0) {
		return "template.errors.critical.sameValues";
	}
	if (type === "failure" && f !== "" && fNum < 0) {
		return "template.errors.critical.negative";
	}
	if (type === "success" && s !== "" && sNum < 0) {
		return "template.errors.critical.negative";
	}
	return null;
}

export function errorClass(values: CriticalValues, type: "failure" | "success"): string {
	if (criticalErrorMessage(values, type)) return "error";
	return "";
}
