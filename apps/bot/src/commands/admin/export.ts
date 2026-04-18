/**
 * Allow to export all characters from the database to a CSV file
 */

import type { EClient } from "@dicelette/client";
import { type CSVRow, getGuildContext } from "@dicelette/helpers";
import { ln, t } from "@dicelette/localization";
import type { UserData } from "@dicelette/types";
import * as Djs from "discord.js";
import Papa from "papaparse";
import "@dicelette/discord_ext";

// small p-limit helper to avoid concurrent bursts against Discord API
function pLimit(concurrency: number) {
	let active = 0;
	const queue: Array<() => void> = [];
	const next = () => {
		active--;
		const job = queue.shift();
		if (job) job();
	};
	return async <T>(fn: () => Promise<T>): Promise<T> => {
		if (active >= concurrency) {
			return new Promise<T>((resolve, reject) => {
				queue.push(() => {
					active++;
					fn().then(resolve).catch(reject).finally(next);
				});
			});
		}
		active++;
		try {
			return await fn();
		} finally {
		}
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
		const buffer = await exportCharactersCsv(client, guildId, isPrivate);
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

export async function exportCharactersCsv(
	client: EClient,
	guildId: string,
	isPrivate?: boolean
): Promise<Buffer | null> {
	const guildData = client.settings.get(guildId);
	if (!guildData) return null;
	const allUser = guildData.user;
	if (!allUser) return null;

	const lang = client.settings.get(guildId, "lang");
	const ul = ln(lang ?? Djs.Locale.EnglishUS);
	const csv: CSVRow[] = [];
	const ctx = getGuildContext(client, guildId);
	const statsName = ctx?.templateID?.statsName;
	const isPrivateAllowed = !!client.settings.get(guildId, "privateChannel");

	// precompute normalized stat keys if template provides names
	const statsNameNormalized: string[] | undefined = statsName
		? statsName.map((n: string) => n.unidecode())
		: undefined;

	const limit = pLimit(10);
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
					// Get character data from in-memory cache
					const memChars: UserData[] =
						(client.characters.get(guildId, user) as UserData[] | undefined) ?? [];
					const charData = memChars.find((c) => {
						if (c.userName && char.charName)
							return c.userName.unidecode() === char.charName.unidecode();
						return !c.userName && !char.charName;
					});
					if (!charData) return;
					const stats = charData;

					// Only export macros saved in the character's fiche, using original names
					const diceLines: string[] = [];
					if (char.damageName && stats.damage) {
						for (const originalName of char.damageName) {
							const formula = stats.damage[originalName.standardize()];
							if (formula)
								diceLines.push(`- ${originalName}${ul("common.space")}: ${formula}`);
						}
					}
					const dice: undefined | string =
						diceLines.length > 0 ? `'${diceLines.join("\n")}` : undefined;

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
	});
	return Buffer.from(`\ufeff${csvText}`, "utf-8");
}
