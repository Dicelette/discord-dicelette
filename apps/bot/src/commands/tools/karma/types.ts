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
export type LeaderBoardRow = {
	userId: string;
	success: number;
	failure: number;
	criticalSuccess: number;
	criticalFailure: number;
	total: number;
};
