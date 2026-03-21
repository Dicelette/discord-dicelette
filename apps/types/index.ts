import type { StatisticalTemplate } from "@dicelette/core";
import type Enmap from "enmap";
import type { TFunction } from "i18next";
import type { GuildData, UserDatabase } from "./src/database";

export type Settings = Enmap<GuildData>;
export type Translation = TFunction<"translation", undefined>;
export type Characters = Enmap<UserDatabase>;
export type CriticalCount = Enmap<DBCount>;
export type TemplateData = Enmap<StatisticalTemplate>;

export type Count = {
	success: number;
	failure: number;
	criticalFailure: number;
	criticalSuccess: number;
	total?: number;
	consecutive?: Series;
	longestStreak?: Series;
};
export type DBCount = Record<string, Count>;

export type Series = {
	failure: number;
	success: number;
};

export type DataToFooter = {
	userID: string;
	userName?: string;
	channelId: string;
	messageId: string;
};

export * from "./src/constants";
export * from "./src/database";
export * from "./src/dice";
export * from "./src/discord";
