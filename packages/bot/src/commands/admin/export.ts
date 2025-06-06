/**
 * Allow to export all characters from the database to a CSV file
 */
import { cmdLn, t } from "@dicelette/localization";
import type { EClient } from "client";
import { getUserFromMessage } from "database";
import * as Djs from "discord.js";
import type { Databases, Settings } from "@dicelette/types";
import Papa from "papaparse";
import { type CSVRow, getLangAndConfig } from "utils";

export const exportData = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("export.name"))
		.setNameLocalizations(cmdLn("export.name"))
		.setDescription(t("export.description"))
		.setDescriptionLocalizations(cmdLn("export.description"))
		.addBooleanOption((option) =>
			option
				.setName(t("export.options.name"))
				.setNameLocalizations(cmdLn("export.options.name"))
				.setDescription(t("export.options.desc"))
				.setDescriptionLocalizations(cmdLn("export.options.desc"))
				.setRequired(false)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const isPrivate = options.getBoolean(t("export.options.name")) ?? undefined;
		const guildId = interaction.guild.id;
		const buffer = await exportToCsv(client, guildId, interaction, isPrivate);
		if (!buffer) {
			await interaction.editReply(t("export.error.noData"));
			return;
		}
		await interaction.editReply({
			files: [
				{
					attachment: buffer,
					name: "export.csv",
				},
			],
		});
	},
};

export const AdminOnly_exportData = {
	data: new Djs.SlashCommandBuilder()
		.setName("export_admin_only")
		.setDescription(t("export.description"))
		.setDescriptionLocalizations(cmdLn("export.description"))
		.addStringOption((option) =>
			option
				.setName("guild_id")
				.setDescription("Guild ID to export data from")
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("export.options.name"))
				.setNameLocalizations(cmdLn("export.options.name"))
				.setDescription(t("export.options.desc"))
				.setDescriptionLocalizations(cmdLn("export.options.desc"))
				.setRequired(false)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const isPrivate = options.getBoolean(t("export.options.name")) ?? undefined;
		const guildId = options.getString("guild_id", true);
		const buffer = await exportToCsv(client, guildId, interaction, isPrivate);
		if (!buffer) {
			await interaction.editReply(t("export.error.noData"));
			return;
		}
		await interaction.editReply({
			files: [
				{
					attachment: buffer,
					name: "export.csv",
				},
			],
		});
	},
};

async function exportToCsv(
	client: EClient,
	guildId: string,
	interaction: Djs.CommandInteraction,
	isPrivate?: boolean
) {
	const guildData = client.settings.get(guildId);
	if (!guildData) {
		await interaction.reply(t("export.error.noData"));
		return;
	}
	const allUser = guildData.user;
	await interaction.deferReply();
	if (!allUser) {
		await interaction.reply(t("export.error.noData"));
		return;
	}
	const { ul } = getLangAndConfig(client, interaction);
	const csv: CSVRow[] = [];
	const statsName = client.settings.get(guildId, "templateID.statsName");
	const isPrivateAllowed = client.settings.get(guildId, "privateChannel");
	//filter the allUser to get only the private characters
	for (const [user, data] of Object.entries(allUser)) {
		const chara = isPrivate
			? data.filter((char) => char.isPrivate)
			: isPrivate === false
				? data.filter((char) => !char.isPrivate)
				: data;
		for (const char of chara) {
			const stats = await getUserFromMessage(client, user, interaction, char.charName, {
				skipNotFound: true,
				fetchAvatar: true,
				fetchChannel: true,
			});
			if (!stats) continue;
			//reparse the statsName to get the name with accented characters
			const dice: undefined | string = stats.damage
				? `'${Object.keys(stats.damage)
						.map((key) => `- ${key}${ul("common.space")}: ${stats.damage?.[key]}`)
						.join("\n")}`
				: undefined;
			let newStats: Record<string, number | undefined> = {};
			if (statsName && stats.stats) {
				for (const name of statsName) {
					newStats[name] = stats.stats?.[name.unidecode()];
				}
			} else if (stats.stats) newStats = stats.stats;
			const statChannelAsString = stats.channel ? `'${stats.channel}` : undefined;
			csv.push({
				user: `'${user}`,
				charName: char.charName,
				channel: statChannelAsString,
				isPrivate:
					char.isPrivate !== undefined
						? char.isPrivate
						: isPrivateAllowed
							? false
							: undefined,
				avatar: stats.avatar,
				dice,
				...newStats,
			});
		}
	}

	const columns = ["user", "charName", "avatar", "channel"];
	if (client.settings.get(guildId, "privateChannel")) columns.push("isPrivate");
	if (statsName) columns.push(...statsName);
	columns.push("dice");
	const csvText = Papa.unparse(csv, {
		delimiter: ";",
		skipEmptyLines: true,
		columns,
		header: true,
		quotes: false,
	});
	return Buffer.from(`\ufeff${csvText}`, "utf-8");
}
