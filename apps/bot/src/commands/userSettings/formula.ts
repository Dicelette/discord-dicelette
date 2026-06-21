import type { EClient } from "@dicelette/client";
import { validateCustomFormula } from "@dicelette/core";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import * as Djs from "discord.js";
import { reply } from "messages";

function set(
	guildId: string,
	userId: string,
	client: EClient,
	formula: string,
	toGuild?: boolean
) {
	if (toGuild) client.settings.set(guildId, formula, "customFormula");
	else client.userSettings.set(guildId, formula, `${userId}.customFormula`);
	return;
}

function reset(guildId: string, userId: string, client: EClient, toGuild?: boolean) {
	if (toGuild) {
		if (client.settings.has(guildId, "customFormula")) {
			client.settings.delete(guildId, "customFormula");
			return true;
		}
		return false;
	}
	if (client.userSettings.has(guildId, `${userId}.customFormula`)) {
		client.userSettings.delete(guildId, `${userId}.customFormula`);
		return true;
	}
	return false;
}

export async function formulaSet(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	toGuild?: boolean
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const formula = interaction.options.getString("formula", false);
	if (!formula) {
		const ok = reset(guildId, userId, client, toGuild);
		if (ok)
			await reply(interaction, {
				content: ul("userSettings.formula.reset"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		else
			await reply(interaction, {
				content: ul("userSettings.formula.notFound"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		return;
	}
	const valided = validateCustomFormula(formula);
	if (valided.ok) {
		await reply(interaction, {
			content: ul("userSettings.formula.saved", { formula }),
			flags: Djs.MessageFlags.Ephemeral,
		});
		set(guildId, userId, client, formula, toGuild);
	} else {
		await reply(interaction, {
			content: ul("userSettings.formula.invalid", { error: valided.error }),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
}

export async function formulaDisplay(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	fromGuild?: boolean
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	let formula: string | undefined;
	if (fromGuild) formula = client.settings.get(guildId, "customFormula");
	else formula = client.userSettings.get(guildId, `${userId}.customFormula`);
	if (formula) {
		await reply(interaction, {
			content: ul("userSettings.formula.display.reply", { formula }),
		});
	} else {
		await reply(interaction, { content: ul("userSettings.formula.noDisplay") });
	}
}
