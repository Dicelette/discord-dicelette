import type Enmap from "enmap";
import type { TFunction } from "i18next";
import type { GuildData } from "./src/database";

export type Settings = Enmap<string, GuildData, unknown>;
export type Translation = TFunction<"translation", undefined>;
export * from "./src/database";
export * from "./src/discord";
export * from "./src/constants";
