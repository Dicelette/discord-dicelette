import type { MacroValues } from "../../interfaces";

type MacroErrorKey =
	| "template.errors.shared.duplicateName"
	| "template.errors.shared.emptyName"
	| "template.errors.shared.emptyValue";

export function macroErrorMessage(
	index: number,
	duplicateIndices: number[],
	dice: MacroValues
): MacroErrorKey | null {
	if (duplicateIndices.includes(index)) return "template.errors.shared.duplicateName";
	if (dice.name.length === 0) return "template.errors.shared.emptyName";
	return null;
}

export function macroValueErrorMessage(dice: MacroValues): MacroErrorKey | null {
	if (dice.name.length === 0) return "template.errors.shared.emptyValue";
	return null;
}
