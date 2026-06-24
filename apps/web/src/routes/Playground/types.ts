import type { SortOrder } from "@dicelette/core";
import type { ComparisonSign } from "@shared";

/** A custom critical row, mirroring the template editor (name + sign + formula). */
export type CustomCriticalEntry = {
	id: string;
	name: string;
	sign: ComparisonSign;
	formula: string;
	onNaturalDice: boolean;
};

/** The collapsible option sections. */
export type SectionKey = "general" | "character" | "statistics" | "criticals" | "display";

/**
 * Every persisted playground option in a single object — mirrors the dashboard's
 * `useForm({ defaultValues })`, so one `useLocalStorageState` replaces ~17.
 */
export type PlaygroundOptions = {
	expression: string;
	pseudo: string;
	criticalSuccess: string;
	criticalFailure: string;
	charName: string;
	statName: string;
	customFormula: string;
	timestamp: boolean;
	disableCompare: boolean;
	sortOrder: SortOrder;
	showContext: boolean;
	showSaveLink: boolean;
	// Statistics referenced in dice via `$name`, stored exactly like the dashboard's
	// attributes: a name → value record (value kept as text to allow formulas).
	statistics: Record<string, string>;
	customCriticals: CustomCriticalEntry[];
	open: Record<SectionKey, boolean>;
};
