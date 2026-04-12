import type { Custom } from "./RenderRow";

type TextualCriticalField = "selection" | "name" | "formula" | "text";

export function customCriticalErrorMessage({
	index,
	idName,
	duplicateIndices,
	customCritical,
}: {
	index: number;
	idName: TextualCriticalField;
	duplicateIndices: number[];
	customCritical: Custom;
}): string | null {
	if (duplicateIndices.includes(index) && idName !== "selection") {
		return "Ce nom est déjà utilisé";
	}
	if (customCritical[idName].length === 0) {
		return "Le texte ne peut pas être vide";
	}
	return null;
}
