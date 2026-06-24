import { SortOrder } from "@dicelette/core";
import type { PlaygroundOptions } from "./types";

// Stand-in ids for fake Discord entities used in the preview output.
export const FAKE_AUTHOR_ID = "0".repeat(18);
export const FAKE_SAVE_CHANNEL = "2".repeat(18);
export const FAKE_GUILD = "1".repeat(18);
export const FAKE_MESSAGEID = "3".repeat(18);

export const SORT_OPTIONS: { value: SortOrder; labelKey: string }[] = [
	{ value: SortOrder.Ascending, labelKey: "config.sort.options.ascending" },
	{ value: SortOrder.Descending, labelKey: "config.sort.options.descending" },
];

export const DEFAULT_OPTIONS: PlaygroundOptions = {
	expression: "1d20+5>=15",
	pseudo: "",
	criticalSuccess: "",
	criticalFailure: "",
	charName: "",
	statName: "",
	customFormula: "",
	timestamp: false,
	disableCompare: false,
	sortOrder: SortOrder.None,
	showContext: false,
	showSaveLink: false,
	statistics: {},
	customCriticals: [],
	open: {
		general: false,
		character: false,
		statistics: false,
		criticals: false,
		display: false,
	},
};
