import type { StatisticalTemplate } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { UserData } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	InvalidCsvContent,
	InvalidURL,
	logger,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import Papa from "papaparse";
import "uniformize";
import process from "node:process";
import { reply } from "messages";

export type CSVRow = {
	user: string;
	charName: string | undefined | null;
	avatar: string | undefined | null;
	isPrivate: boolean | undefined;
	channel: string | undefined;
	dice: string | undefined;
	[key: string]: string | number | undefined | boolean | null;
};

/** Parses CSV data (URL or raw text) into structured user data for a guild, validating headers/required fields
 * against the guild template; can report errors via a Discord interaction. */
export async function parseCSV(
	url: string,
	guildTemplate: StatisticalTemplate,
	interaction?: Djs.CommandInteraction,
	allowPrivate?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	let header = ["user", "charName", "avatar", "channel"];
	if (guildTemplate.statistics) {
		header = header.concat(
			Object.keys(guildTemplate.statistics).map((key) => key.standardize())
		);
	}
	if (allowPrivate) header.push("isPrivate");

	const ul = ln(lang);
	header.push("dice");
	header = header.map((key) => key.standardize());

	const csvText = url.startsWith("https://") ? await readCSV(url) : url;
	if (!csvText || csvText.length === 0) throw new InvalidCsvContent("url");

	let error: string | undefined;
	let csvData: CSVRow[] = [];
	Papa.parse(csvText.replaceAll(/\s+;\s*/gi, ";"), {
		async complete(results) {
			if (!results.data) {
				logger.warn("Error while parsing CSV", results.errors);
				error = "Error while parsing CSV";
				return;
			}
			// Missing header check — an extra header being present is fine.
			const dataHeader = results.meta.fields?.map((key) => key.standardize());
			if (!dataHeader) {
				logger.warn("Error while parsing CSV, missing header");
				if (interaction)
					await reply(interaction, {
						content: ul("import.errors.missing_header"),
					});
				error = "Missing header";
				return;
			}
			const missingHeader = header
				.filter((key) => !dataHeader.includes(key))
				.filter((key) => key !== "dice" && key !== "avatar" && key !== "channel");
			if (missingHeader.length > 0) {
				logger.warn("\nError while parsing CSV, missing header values", missingHeader);
				if (interaction)
					await reply(interaction, {
						content: ul("import.errors.headers", {
							name: missingHeader.join("\n- "),
						}),
					});
				error = "Missing header values";
				return;
			}
			csvData = results.data as CSVRow[];
		},
		dynamicTyping: true,
		header: true,
		skipEmptyLines: true,
	});
	if (error)
		throw new BotError(error, { cause: "CSV_PARSE", level: BotErrorLevel.Warning });
	if (csvData.length === 0) throw new InvalidCsvContent("url");
	return await step(csvData, guildTemplate, interaction, allowPrivate, lang);
}

/** Reads a remote CSV file's contents. */
async function readCSV(url: string): Promise<string> {
	if (process.env.NODE_ENV === "development" && process.env.PROXY_DISCORD_CDN)
		url = url.replace("https://cdn.discordapp.com", process.env.PROXY_DISCORD_CDN);
	const response = await fetch(url);
	if (!response.ok) throw new InvalidURL(url);

	return response.text();
}

/** Processes parsed CSV rows into user data grouped by user ID, validating character names and required stats.
 * Replies to the interaction (if given) with errors for missing users/names/duplicates/stats. */
async function step(
	csv: CSVRow[],
	guildTemplate: StatisticalTemplate,
	interaction?: Djs.CommandInteraction,
	allowPrivate?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	const members: {
		[id: string]: UserData[];
	} = {};
	const ul = ln(lang);
	const errors: string[] = [];
	const allMembers = interaction ? await interaction.guild?.members.fetch() : undefined;
	if (interaction && !allMembers) {
		const msg = ul("import.errors.no_user");
		errors.push(msg);
		return { errors, members };
	}
	//get the user id from the guild
	for (const data of csv) {
		const user = data.user.toString().replaceAll("'", "").trim();
		const cleannedChannel = data.channel
			? data.channel.replaceAll("'", "").trim()
			: undefined;
		const channel =
			cleannedChannel && cleannedChannel.trim().length > 0 ? cleannedChannel : undefined;
		const charName = data.charName;

		//get user from the guild
		let guildMember: undefined | Djs.GuildMember;
		let userID: string | undefined = user;

		//get the user from the guild
		if (interaction) {
			if (!allMembers) {
				const msg = ul("import.errors.no_user");
				errors.push(msg);
				continue;
			}
			guildMember = allMembers.find(
				(member) =>
					member.user.id === user ||
					member.user.username === user ||
					member.user.tag === user
			);
			if (!guildMember?.user) {
				const msg = ul("import.errors.user_not_found", { user });
				await reply(interaction, { content: msg });
				errors.push(msg);
				continue;
			}
			userID = guildMember.id;
		}
		const isPrivate = data.isPrivate;

		if (!members[userID]) members[userID] = [];
		if (guildTemplate.charName && !charName) {
			if (interaction) {
				const msg = ul("import.errors.missing_charName", {
					user: Djs.userMention(userID),
				});
				await reply(interaction, { content: msg });
				errors.push(msg);
			}
			logger.warn(`Missing character name for ${user}`);
			continue;
		}
		//prevent duplicate with verify the charName
		if (
			members[userID].find((char) => {
				if (char.userName && charName)
					return char.userName.unidecode() === charName.unidecode();
				return !char.userName && !charName;
			})
		) {
			if (interaction) {
				const msg = ul("import.errors.duplicate_charName", {
					charName: charName ?? ul("common.default"),
					user: Djs.userMention(userID),
				});
				await reply(interaction, { content: msg });
				errors.push(msg);
			}
			logger.warn(`Duplicate character name for ${user}`);
			continue;
		}
		const stats: Record<string, number> = {};
		//get the stats
		if (guildTemplate.statistics) {
			const emptyStats = Object.keys(guildTemplate.statistics).filter(
				(key) => !data[key]
			);
			if (emptyStats.length > 0) {
				if (interaction) {
					const msg = ul("import.errors.missing_stats", {
						stats: emptyStats.join("\n- "),
						user: Djs.userMention(userID),
					});
					await reply(interaction, { content: msg });
					errors.push(msg);
				}
				logger.warn(`Missing stats for ${user}. Missing: ${emptyStats.join("\n- ")}`);
				continue;
			}

			for (const key of Object.keys(guildTemplate.statistics)) {
				stats[key] = data[key] as number;
			}
		}
		// Create mapping for damage names: standardized -> original (preserve accents)
		const damageNameNormalized: Map<string, string> = new Map();
		if (guildTemplate.damage) {
			for (const name of Object.keys(guildTemplate.damage)) {
				damageNameNormalized.set(name.standardize(), name);
			}
		}

		const dice: Record<string, string> | undefined = data.dice?.replaceAll("'", "")
			? data.dice.split(/\r?\n/).reduce(
					(acc, line) => {
						const match = line.match(/-\s*([^:]+)\s*:\s*(.+)/);
						if (match) {
							let key = match[1].trim();
							// Map standardized key back to original template name if available
							const originalKey = damageNameNormalized.get(key.standardize());
							if (originalKey) key = originalKey;
							acc[key] = match[2].trim();
						}
						return acc;
					},
					{} as Record<string, string>
				)
			: undefined;
		const newChar: UserData = {
			avatar: data.avatar ?? undefined,
			channel,
			damage: dice,
			private: allowPrivate ? isPrivate : undefined,
			stats,
			template: {
				critical: guildTemplate.critical,
				diceType: guildTemplate.diceType,
			},
			userName: charName,
		};
		if (!newChar.private) delete newChar.private;
		if (!newChar.avatar) delete newChar.avatar;
		members[userID].push(newChar);
	}
	return { errors, members };
}
