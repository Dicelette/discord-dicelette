import type Enmap from "enmap";
import type { TFunction } from "i18next";
import type { GuildData, UserDatabase } from "./src/database";

export type Settings = Enmap<string, GuildData, unknown>;
export type Translation = TFunction<"translation", undefined>;
export type Characters = Enmap<string, UserDatabase, unknown>;

export * from "./src/constants";
export * from "./src/database";
export * from "./src/dice";
export * from "./src/discord";
