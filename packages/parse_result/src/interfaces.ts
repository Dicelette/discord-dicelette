import type { GuildData } from "@dicelette/types";
import type * as Djs from "discord.js";

export interface Server {
	lang: Djs.Locale;
	userId?: string;
	config?: Partial<GuildData>;
	dice?: string;
}
