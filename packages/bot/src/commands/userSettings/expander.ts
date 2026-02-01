import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import * as Djs from "discord.js";
import { reply } from "../../messages";
import { chunkMessage, errorMessage, getContentFile } from "./snippets";
import { t } from "@dicelette/localization";

export async function display(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const userStats = client.userSettings.get(guildId, userId)?.stats ?? {};
	const entries = Object.entries(userStats);
	if (entries.length === 0) {
		const text = ul("userSettings.expander.stats.empty");
		await interaction.followUp({ content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	await chunkMessage(entries, ul, interaction);
}

export async function remove(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const statName = interaction.options.getString("name", true);
	const userSettings = client.userSettings.get(guildId, userId);
	const userStats = userSettings?.stats ?? {};
	if (!(statName in userStats)) {
		const text = ul("userSettings.expander.delete.notFound", {
			name: `**${statName.toTitle()}**`,
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	delete userStats[statName];
	const key = `${userId}.stats`;
	client.userSettings.set(guildId, userStats, key);
	const text = ul("userSettings.expander.delete.success", {
		name: `**${statName.toTitle()}**`,
	});
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}

export async function exportStats(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const userStats = client.userSettings.get(guildId, userId)?.stats ?? {};
	if (Object.keys(userStats).length === 0) {
		const text = ul("userSettings.expander.export.empty");
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const fileContent = JSON.stringify(userStats, null, 2);
	const buffer = Buffer.from(fileContent, "utf-8");
	const attachment = new Djs.AttachmentBuilder(buffer, {
		name: `expander-stats-${userId}.json`,
	});
	const text = ul("userSettings.expander.export.success");
	await reply(interaction, {
		content: text,
		files: [attachment],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function importExpander(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const data = await getContentFile(client, interaction);
	if (!data) return;
	const { fileContent, guildId, overwrite, ul, userId } = data;
	let importedStats: Record<string, number>;
	const ex: Record<string, number> = {
		stat1: 10,
		stat2: 20,
	};
	try {
		importedStats = JSON.parse(fileContent);
	} catch {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify(ex, null, 2),
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const key = `${userId}.stats`;
	let currentStats = client.userSettings.get(guildId, userId)?.stats ?? {};
	if (overwrite) currentStats = {};
	//verify the type of importedStats
	const errors: Record<string, unknown> = {};
	let count = 0;
	for (const [statName, statValue] of Object.entries(importedStats)) {
		if (typeof statValue !== "number" || Number.isNaN(statValue)) {
			errors[statName] = JSON.stringify(statValue);
			continue;
		}
		currentStats[statName] = statValue;
		count++;
	}
	client.userSettings.set(guildId, currentStats, key);
	const text = errorMessage("expander", ul, errors, count);
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}

export async function register(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const statName = interaction.options.getString(t("common.name"), true);
	const initialValue = interaction.options.getNumber(t("userSettings.expander.create.value.title"), true);
	const userSettings = client.userSettings.get(guildId, userId);
	const userStats = userSettings?.stats ?? {};
	userStats[statName] = initialValue;
	const key = `${userId}.stats`;
	client.userSettings.set(guildId, userStats, key);
	const text = ul("userSettings.expander.register.success", {
		name: `**${statName.toTitle()}**`,
		value: `**${initialValue}**`,
	});
	await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
}
