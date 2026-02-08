/**
 * Allow to export all characters from the database to a CSV file
 */

import {
	type CSVRow,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import Papa from "papaparse";
import "discord_ext";

// small p-limit helper to avoid concurrent bursts against Discord API
function pLimit(concurrency: number) {
	let active = 0;
	const queue: Array<() => void> = [];
	const next = () => {
		active--;
		const job = queue.shift();
		if (job) job();
	};
	return <T>(fn: () => Promise<T>): Promise<T> => {
		if (active >= concurrency) {
			return new Promise<T>((resolve, reject) => {
				queue.push(() => {
					active++;
					fn().then(resolve).catch(reject).finally(next);
				});
			});
		}
		active++;
		return fn().finally(next);
	};
}

export const exportData = {
	data: new Djs.SlashCommandBuilder()
		.setNames("export.name")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setDefaultMemberPermissions(Djs.PermissionsBitField.Flags.ManageRoles)
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
	const ctx = getGuildContext(client, guildId);
	const statsName = ctx?.templateID?.statsName;
	const isPrivateAllowed = !!client.settings.get(guildId, "privateChannel");

	// precompute normalized stat keys if template provides names
	const statsNameNormalized: string[] | undefined = statsName
		? statsName.map((n: string) => n.unidecode())
		: undefined;

	// build a list of tasks to run with limited concurrency
	const limit = pLimit(3);
	const tasks: Promise<void>[] = [];

	for (const [user, data] of Object.entries(allUser)) {
		const chara = isPrivate
			? data.filter((char) => char.isPrivate)
			: isPrivate === false
				? data.filter((char) => !char.isPrivate)
				: data;

		for (const char of chara) {
			tasks.push(
				limit(async () => {
					const stats = (
						await getUserFromInteraction(client, user, interaction, char.charName, {
							cleanUrl: false,
							fetchAvatar: true,
							fetchChannel: true,
							skipNotFound: true,
						})
					)?.userData;
					if (!stats) return;

					// dice lines with localized separator/space
					const dice: undefined | string = stats.damage
						? `'${Object.keys(stats.damage)
								.map((key) => `- ${key}${ul("common.space")}: ${stats.damage?.[key]}`)
								.join("\n")}`
						: undefined;

					// map stats according to template names (preserve accented names in CSV header)
					let newStats: Record<string, number | undefined> = {};
					if (statsNameNormalized && stats.stats) {
						for (let i = 0; i < statsNameNormalized.length; i++) {
							const name = statsName?.[i];
							if (!name) continue;
							const norm = statsNameNormalized[i];
							newStats[name] = stats.stats?.[norm];
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
				})
			);
		}
	}

	await Promise.allSettled(tasks);

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
