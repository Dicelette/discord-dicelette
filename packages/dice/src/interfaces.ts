import type { GuildData } from "@dicelette:types/database";
import type * as Djs from "discord.js";
export const DETECT_DICE_MESSAGE = /([\w\.]+|(\{.*\})) (.*)/i;

export interface Server {
	lang: Djs.Locale;
	userId: string;
	config?: Partial<GuildData>;
}

export type RollResult = {
	error?: boolean;
	result: string;
};
