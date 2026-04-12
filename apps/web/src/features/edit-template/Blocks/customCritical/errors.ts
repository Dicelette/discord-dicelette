import type { DataForm } from "../../interfaces";

type TextualCriticalField = "selection" | "name" | "formula" | "text";
type CustomCriticalErrorKey =
	| "template.errors.shared.duplicateName"
	| "template.errors.customCritical.emptyText";

export function customCriticalErrorMessage({
	index,
	idName,
	duplicateIndices,
	isDuplicate,
	customCritical,
}: {
	index?: number;
	idName: TextualCriticalField;
	duplicateIndices?: number[];
	isDuplicate?: boolean;
	customCritical: DataForm["customCritical"][number];
}): CustomCriticalErrorKey | null {
	const duplicate =
		isDuplicate ??
		(index !== undefined && duplicateIndices ? duplicateIndices.includes(index) : false);
	if (duplicate && idName !== "selection") {
		return "template.errors.shared.duplicateName";
	}
	if (customCritical[idName].length === 0) {
		return "template.errors.customCritical.emptyText";
	}
	return null;
}
