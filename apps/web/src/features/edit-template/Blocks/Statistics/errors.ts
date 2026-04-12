import type { StatisticFields } from "../../interfaces";
import { isNumber, under } from "../../utils";

export function minimalErrorMessage(
	_index: number,
	statistics: StatisticFields
): string | null {
	const { min, max } = statistics;
	if (!min) return null;
	if (min && max && min > max) {
		return "La valeur minimale ne peut pas être supérieure à la valeur maximale";
	}
	if (under(min, 0)) {
		return "La valeur minimale ne peut pas être négative";
	}
	if (!isNumber(min)) {
		return "La valeur minimale doit être un nombre";
	}
	return null;
}

export function maximalErrorMessage(
	_index: number,
	statistic: StatisticFields
): string | null {
	const { min, max } = statistic;
	if (!max) return null;
	if (min && max && min > max) {
		return "La valeur maximale ne peut pas être inférieure à la valeur minimale";
	}
	if (under(max, 0)) {
		return "La valeur maximale ne peut pas être négative";
	}
	if (!isNumber(max)) {
		return "La valeur maximale doit être un nombre";
	}
	return null;
}

export function minimalErrorClass(statistic: StatisticFields): string {
	const { min, max } = statistic;
	if (!min) return "";
	if (min && max && min > max) return "error";
	if (under(min, 0)) return "error";
	if (Number.isNaN(Number.parseInt(String(min), 10))) return "error";
	return "";
}

export function maximalErrorClass(statistic: StatisticFields): string {
	const { min, max } = statistic;
	if (!max) return "";
	if (min && max && min > max) return "error";
	if (under(max, 0)) return "error";
	if (!isNumber(max)) return "error";
	return "";
}

export function nameErrorMessage(
	index: number,
	duplicateIndices: number[],
	name: string
): string | null {
	if (name.length === 0) return "Le nom ne peut pas être vide";
	if (duplicateIndices.includes(index)) return "Ce nom est déjà utilisé";
	return null;
}

export function nameErrorClass(name: string): string {
	if (name.length === 0) return "error";
	return "";
}
