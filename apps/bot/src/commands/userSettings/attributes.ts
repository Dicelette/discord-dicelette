import type { EClient } from "@dicelette/client";
import {
	buildJsonAttachment,
	chunkErrorMessage,
	chunkMessage,
	errorMessage,
	getContentFile,
	getInteractionContext as getLangAndConfig,
	processEntries,
	registerEntry,
	validateAttributeEntry,
} from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import * as Djs from "discord.js";
import { reply } from "../../messages";

export async function display(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const userSettings = client.userSettings.get(guildId, userId);
	const userStats = userSettings?.attributes ?? {};
	const defaultValue = userSettings?.ignoreNotfound;
	const entries = Object.entries(userStats);
	if (entries.length === 0) {
		await reply(interaction, {
			content: ul("userSettings.attributes.list.empty"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	let appendText: undefined | string;
	if (defaultValue)
		appendText = `\n__**${ul("userSettings.attributes.replaceUnknown.placeholder")}**__ \`${defaultValue}\``;
	await chunkMessage(entries, ul, interaction, appendText);
}

export async function exportStats(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const userId = interaction.user.id;
	const guildId = interaction.guild!.id;
	const userStats = client.userSettings.get(guildId, userId)?.attributes ?? {};
	if (Object.keys(userStats).length === 0) {
		const text = ul("userSettings.attributes.export.empty");
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const attachment = buildJsonAttachment(userStats, `attributes-stats-${userId}.json`);
	const text = ul("userSettings.attributes.export.success");
	await reply(interaction, {
		content: text,
		files: [attachment],
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export async function importAttributes(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const data = await getContentFile(interaction, t, ul);
	if (!data) return;
	const { fileContent, guildId, overwrite, userId } = data;
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
	if (
		typeof importedStats !== "object" ||
		importedStats === null ||
		Array.isArray(importedStats)
	) {
		const text = ul("userSettings.snippets.import.invalidContent", {
			ex: JSON.stringify(ex, null, 2),
		});
		await reply(interaction, { content: text, flags: Djs.MessageFlags.Ephemeral });
		return;
	}
	const {
		result: validated,
		errors,
		count,
	} = await processEntries<number>(importedStats, async (name, value) =>
		validateAttributeEntry(name, value)
	);
	const key = `${userId}.attributes`;
	let currentStats = client.userSettings.get(guildId, userId)?.attributes ?? {};
	if (overwrite) currentStats = {};

	for (const [name, val] of Object.entries(validated)) currentStats[name] = val as number;

	client.userSettings.set(guildId, currentStats, key);
	const text = errorMessage("attributes", ul, errors, count, validated);
	await chunkErrorMessage(text, interaction);
}

export async function register(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const statName = interaction.options.getString(t("common.name"), true);
	const initialValue = interaction.options.getNumber(
		t("userSettings.attributes.create.value.title"),
		true
	);
	await registerEntry(
		client,
		interaction,
		"attributes",
		statName,
		initialValue,
		ul,
		(name, value) => ({
			name: `**${name.toTitle()}**`,
			value: `**${value}**`,
		})
	);
}

export async function setUnknowReplace(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const value = interaction.options.getString(
		t("userSettings.attributes.create.value.title"),
		false
	);
	if (!value) {
		client.userSettings.delete(
			interaction.guild!.id,
			`${interaction.user.id}.ignoreNotfound`
		);
		await reply(interaction, {
			content: ul(ul("userSettings.attributes.replaceUnknown.reset")),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	client.userSettings.set(
		interaction.guild!.id,
		value,
		`${interaction.user.id}.ignoreNotfound`
	);
	await reply(interaction, {
		content: ul(ul("userSettings.attributes.replaceUnknown.set"), { value }),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}
