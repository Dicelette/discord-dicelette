import type { StatisticFields } from "../../interfaces";
import { isNumber, under } from "../../utils";

type StatisticsErrorKey =
	| "template.errors.statistics.minGreaterThanMax"
	| "template.errors.statistics.minNegative"
	| "template.errors.statistics.minNotNumber"
	| "template.errors.statistics.maxLowerThanMin"
	| "template.errors.statistics.maxNegative"
	| "template.errors.statistics.maxNotNumber"
	| "template.errors.shared.emptyName"
	| "template.errors.shared.duplicateName";

export function minimalErrorMessage(
	_index: number,
	statistics: StatisticFields
): StatisticsErrorKey | null {
	const { min, max } = statistics;
	if (!min) return null;
	if (min && max && min > max) {
		return "template.errors.statistics.minGreaterThanMax";
	}
	if (under(min, 0)) {
		return "template.errors.statistics.minNegative";
	}
	if (!isNumber(min)) {
		return "template.errors.statistics.minNotNumber";
	}
	return null;
}

export function maximalErrorMessage(
	_index: number,
	statistic: StatisticFields
): StatisticsErrorKey | null {
	const { min, max } = statistic;
	if (!max) return null;
	if (min && max && min > max) {
		return "template.errors.statistics.maxLowerThanMin";
	}
	if (under(max, 0)) {
		return "template.errors.statistics.maxNegative";
	}
	if (!isNumber(max)) {
		return "template.errors.statistics.maxNotNumber";
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
): StatisticsErrorKey | null {
	if (name.length === 0) return "template.errors.shared.emptyName";
	if (duplicateIndices.includes(index)) return "template.errors.shared.duplicateName";
	return null;
}

export function nameErrorClass(name: string): string {
	if (name.length === 0) return "error";
	return "";
}
