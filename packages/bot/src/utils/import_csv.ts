import type { StatisticalTemplate } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { UserData } from "@dicelette/types";
import { InvalidCsvContent, InvalidURL, logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import Papa from "papaparse";
import "uniformize";
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

/**
 * Parses CSV data containing user statistics and character information for a Discord guild.
 *
 * Accepts either a remote CSV file URL or raw CSV text, validates headers and required fields based on the provided guild template, and returns structured user data. Supports localization and can report errors via a Discord interaction if provided.
 *
 * @returns A promise resolving to structured user data grouped by user ID.
 *
 * @throws {InvalidCsvContent} If the CSV content is empty or missing.
 * @throws {Error} If required headers are missing or the CSV cannot be parsed.
 */
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
	//papaparse can't be used in Node, we need first to create a readable stream

	const csvText = url.startsWith("https://") ? await readCSV(url) : url;
	if (!csvText || csvText.length === 0) {
		throw new InvalidCsvContent("url");
	}
	let error: string | undefined;
	let csvData: CSVRow[] = [];
	Papa.parse(csvText.replaceAll(/\s+;\s*/gi, ";"), {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		//in case the file was wrongly parsed, we need to trim the space before and after the key

		async complete(results) {
			if (!results.data) {
				console.error("\nError while parsing CSV", results.errors);
				error = "Error while parsing CSV";
				return;
			}
			//throw error if missing header (it shouldn't not throw if a header is added)
			const dataHeader = results.meta.fields?.map((key) => key.standardize());
			if (!dataHeader) {
				console.error("\nError while parsing CSV, missing header");
				if (interaction)
					await reply(interaction, {
						content: ul("import.errors.missing_header"),
					});
				error = "Missing header";
				return;
			}
			//throw error only if missing values for the header
			const missingHeader = header
				.filter((key) => !dataHeader.includes(key))
				.filter((key) => key !== "dice" && key !== "avatar" && key !== "channel");
			if (missingHeader.length > 0) {
				console.error("\nError while parsing CSV, missing header values", missingHeader);
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
	});
	if (error) {
		throw new Error(error);
	}
	if (csvData.length === 0) {
		throw new InvalidCsvContent("url");
	}
	return await step(csvData, guildTemplate, interaction, allowPrivate, lang);
}

/**
 * Read the distant CSV file
 * @param url {string} The URL of the CSV file
 * @returns {Promise<string>}
 */
async function readCSV(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new InvalidURL(url);
	}
	return response.text();
}

/**
 * Processes parsed CSV rows into structured user data grouped by user ID, validating character names and required statistics according to the guild template.
 *
 * @returns An object containing `members`, a mapping of user IDs to arrays of user data, and `errors`, an array of error messages encountered during processing.
 *
 * @remark Replies to the provided Discord interaction with error messages for missing users, character names, duplicate character names, or missing statistics.
 */
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
	//get the user id from the guild
	for (const data of csv) {
		const user = data.user.toString().replaceAll("'", "").trim();
		const channel = data.channel ? data.channel.replaceAll("'", "").trim() : undefined;
		const charName = data.charName;

		//get user from the guild
		let guildMember: undefined | Djs.GuildMember;
		let userID: string | undefined = user;

		//get the user from the guild
		if (interaction) {
			const allMembers = await interaction?.guild?.members.fetch();
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
			if (!guildMember || !guildMember.user) {
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
					user: Djs.userMention(userID),
					charName: charName ?? ul("common.default"),
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
						user: Djs.userMention(userID),
						stats: emptyStats.join("\n- "),
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
		const dice: Record<string, string> | undefined = data.dice?.replaceAll("'", "")
			? data.dice.split(/\r?\n/).reduce(
					(acc, line) => {
						const match = line.match(/-\s*([^:]+)\s*:\s*(.+)/);
						if (match) {
							const key = match[1].trim();
							acc[key] = match[2].trim();
						}
						return acc;
					},
					{} as Record<string, string>
				)
			: undefined;
		const newChar: UserData = {
			userName: charName,
			stats,
			template: {
				diceType: guildTemplate.diceType,
				critical: guildTemplate.critical,
			},
			private: allowPrivate ? isPrivate : undefined,
			damage: dice,
			avatar: data.avatar ?? undefined,
			channel,
		};
		logger.trace("Adding character", newChar);
		if (!newChar.private) delete newChar.private;
		if (!newChar.avatar) delete newChar.avatar;
		members[userID].push(newChar);
	}
	return { members, errors };
}
