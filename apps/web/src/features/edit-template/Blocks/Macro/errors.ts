import type { MacroValues } from "../../interfaces";

export function macroErrorMessage(
	index: number,
	duplicateIndices: number[],
	dice: MacroValues
): string | null {
	if (duplicateIndices.includes(index)) return "Ce nom est déjà utilisé";
	if (dice.name.length === 0) return "Le nom ne peut pas être vide";
	return null;
}

export function macroValueErrorMessage(dice: MacroValues): string | null {
	if (dice.name.length === 0) return "La valeur ne peut pas être vide";
	return null;
}
