/**
 * Allow to export all characters from the database to a CSV file
 */
import { t } from "@dicelette/localization";
import type { EClient } from "client";
import { getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import Papa from "papaparse";
import { type CSVRow, getLangAndConfig } from "utils";
import "discord_ext";

export const exportData = {
	data: new Djs.SlashCommandBuilder()
		.setNames("export.name")
		.setDescriptions("export.description")
		.addBooleanOption((option) =>
			option
				.setNames("export.options.name")
				.setDescriptions("export.options.desc")
				.setRequired(false)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const isPrivate = options.getBoolean(t("export.options.name")) ?? undefined;
		const guildId = interaction.guild.id;
		await interaction.deferReply();
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
		await interaction.editReply(t("export.error.noData"));
		return;
	}
	const allUser = guildData.user;

	if (!allUser) {
		await interaction.editReply(t("export.error.noData"));
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
			const stats = (
				await getUserFromInteraction(client, user, interaction, char.charName, {
					fetchAvatar: true,
					fetchChannel: true,
					skipNotFound: true,
				})
			)?.userData;
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
				avatar: stats.avatar,
				channel: statChannelAsString,
				charName: char.charName,
				dice,
				isPrivate:
					char.isPrivate !== undefined
						? char.isPrivate
						: isPrivateAllowed
							? false
							: undefined,
				user: `'${user}`,
				...newStats,
			});
		}
	}

	const columns = ["user", "charName", "avatar", "channel"];
	if (client.settings.get(guildId, "privateChannel")) columns.push("isPrivate");
	if (statsName) columns.push(...statsName);
	columns.push("dice");
	const csvText = Papa.unparse(csv, {
		columns,
		delimiter: ";",
		header: true,
		quotes: false,
		skipEmptyLines: true,
	});
	return Buffer.from(`\ufeff${csvText}`, "utf-8");
}
