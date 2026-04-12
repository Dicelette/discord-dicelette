import type { Custom } from "./RenderRow";

type TextualCriticalField = "selection" | "name" | "formula" | "text";
type CustomCriticalErrorKey =
	| "template.errors.shared.duplicateName"
	| "template.errors.customCritical.emptyText";

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
}): CustomCriticalErrorKey | null {
	if (duplicateIndices.includes(index) && idName !== "selection") {
		return "template.errors.shared.duplicateName";
	}
	if (customCritical[idName].length === 0) {
		return "template.errors.customCritical.emptyText";
	}
	return null;
}
