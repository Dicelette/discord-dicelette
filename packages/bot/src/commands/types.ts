import type { EClient } from "@dicelette/client";
import type * as Djs from "discord.js";

export interface BaseCommand {
	data: Djs.SlashCommandBuilder | Djs.SlashCommandSubcommandsOnlyBuilder;
	execute?: (i: Djs.ChatInputCommandInteraction, client: EClient) => Promise<void>;
	autocomplete?: (i: Djs.AutocompleteInteraction, client: EClient) => Promise<void>;
}

export type Command = BaseCommand;

export type MarkedAutocomplete = Command & { data: { autocompleted?: boolean } };
export type MarkedDatabase = Command & { data: { needDatabase?: boolean } };

export function isMarkedAutocompleted(c: Command): c is MarkedAutocomplete {
	return Boolean(Reflect.get(c.data as unknown as object, "autocompleted"));
}

export function isMarkedDatabase(c: Command): c is MarkedDatabase {
	return Boolean(Reflect.get(c.data as unknown as object, "needDatabase"));
}
