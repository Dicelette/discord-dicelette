import type { CriticalValues } from "../../interfaces";

export function criticalErrorMessage(
	values: CriticalValues,
	type: "failure" | "success"
): string | null {
	const s = values.success?.toString() ?? "";
	const f = values.failure?.toString() ?? "";
	const sNum = Number(s);
	const fNum = Number(f);

	if (s !== "" && f !== "" && fNum === sNum && fNum >= 0 && sNum >= 0) {
		return "Les deux valeurs ne peuvent être identiques";
	}
	if (type === "failure" && f !== "" && fNum < 0) {
		return "La valeur ne peut pas être inférieure à 0";
	}
	if (type === "success" && s !== "" && sNum < 0) {
		return "La valeur ne peut pas être inférieure à 0";
	}
	return null;
}

export function errorClass(values: CriticalValues, type: "failure" | "success"): string {
	if (criticalErrorMessage(values, type)) return "error";
	return "";
}
