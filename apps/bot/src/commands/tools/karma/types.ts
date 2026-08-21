export type { LeaderBoardRow } from "@dicelette/utils";

export type Options =
	| "criticalSuccess"
	| "criticalFailure"
	| "success"
	| "failure"
	| "total";
export type SortMode = "brut" | "ratio";
export const ALL_OPTIONS: Options[] = [
	"total",
	"success",
	"failure",
	"criticalSuccess",
	"criticalFailure",
];
