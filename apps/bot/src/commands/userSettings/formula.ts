import type { EClient } from "@dicelette/client";
import { validateCustomFormula } from "@dicelette/core";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import * as Djs from "discord.js";
import { reply } from "messages";

/** Guild formula; the user's one is generated from `USER_OPTIONS`. */
export async function formulaSet(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const guildId = interaction.guild!.id;
	const formula = interaction.options.getString("formula", false);
	const send = (content: string) =>
		reply(interaction, { content, flags: Djs.MessageFlags.Ephemeral });

	if (!formula) {
		if (!client.settings.has(guildId, "customFormula"))
			return await send(ul("userSettings.formula.notFound"));
		client.settings.delete(guildId, "customFormula");
		return await send(ul("userSettings.formula.reset"));
	}
	const valided = validateCustomFormula(formula);
	if (!valided.ok)
		return await send(ul("userSettings.formula.invalid", { error: valided.error }));
	client.settings.set(guildId, formula, "customFormula");
	await send(ul("userSettings.formula.saved", { formula }));
}

export async function formulaDisplay(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const formula = client.settings.get(interaction.guild!.id, "customFormula");
	await reply(interaction, {
		content: formula
			? ul("userSettings.formula.display.reply", { formula })
			: ul("config.formula.noDisplay"),
	});
}
