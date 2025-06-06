import type Enmap from "enmap";
import type { TFunction } from "i18next";
import type { GuildData, UserDatabase } from "./src/database";
import type { StatisticalTemplate } from "@dicelette/core";
import type * as Djs from "discord.js";

export type Settings = Enmap<string, GuildData, unknown>;
export type Translation = TFunction<"translation", undefined>;
export type Characters = Enmap<string, UserDatabase, unknown>;
export interface Databases {
	settings: Settings;
	characters: Characters;
	template: Enmap<string, StatisticalTemplate, unknown>;
	guildLocale: Enmap<string, Djs.Locale, unknown>;
}
export * from "./src/constants";
export * from "./src/database";
export * from "./src/discord";
