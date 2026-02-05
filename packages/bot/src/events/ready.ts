// noinspection ES6MissingAwait
/** biome-ignore-all lint/suspicious/noTsIgnore: let me alone */

import process from "node:process";
import type { EClient } from "@dicelette/client";
import { ln } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { dev, important, logger } from "@dicelette/utils";
import {
	COMMANDS_GLOBAL,
	contextMenus,
	GLOBAL_CMD,
	GUILD_ONLY_COMMANDS,
	PRIVATES_COMMANDS,
} from "commands";
import { getTemplate, getUser } from "database";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { PRIVATE_ID, VERSION } from "../../index";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });

export default (client: EClient): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;
		logger.trace(`${client.user.username} is online; v.${VERSION}`);
		let serializedCommands = COMMANDS_GLOBAL.map((x) => {
			if (!x.data.contexts) x.data.setContexts(Djs.InteractionContextType.Guild);
			if (
				!x.data.integration_types &&
				x.data.contexts?.includes(Djs.InteractionContextType.Guild)
			)
				x.data.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall);

			return x.data.toJSON();
		});
		const serializedDbCmds = GUILD_ONLY_COMMANDS.map((command) => command.data.toJSON());

		client.user.setActivity(client.status.text, {
			type: client.status.type,
		});
		serializedCommands = serializedCommands.concat(
			//@ts-ignore
			contextMenus.map((cmd) => cmd.toJSON())
		);
		const isDev = process.env.NODE_ENV === "development" && !process.env.DEV_COMMANDS;

		try {
			if (isDev) {
				await client.application?.commands.set(GLOBAL_CMD.map((x) => x.data.toJSON()));
			} else await client.application?.commands.set(serializedCommands);
			logger.info(`Global commands updated (${serializedCommands.length})`);
		} catch (err) {
			logger.error("Failed to update global commands:", err);
		}

		const guildPromises = Array.from(client.guilds.cache.values()).map(async (guild) => {
			const enabled = client.settings.get(guild.id, "templateID.messageId");

			try {
				if (isDev) {
					// For fast local testing, register full set (globals + per-guild) on the guild
					let devCommands = [...serializedCommands];
					if (enabled) {
						devCommands = devCommands.filter(
							(cmd) => !serializedDbCmds.find((c) => c.name === cmd.name)
						);
						devCommands = devCommands.concat(serializedDbCmds);
					}
					if (guild.id === PRIVATE_ID) {
						devCommands = devCommands.concat(
							PRIVATES_COMMANDS.map((x) => x.data.toJSON())
						);
					}
					await guild.commands.set(devCommands);
				} else {
					let guildCommands: Djs.ApplicationCommandDataResolvable[] = [];

					if (enabled) {
						for (const cmd of serializedDbCmds) {
							logger.trace("Enabling command:", cmd.name);
							cmd.default_member_permissions = undefined;
						}
					} else {
						//verify that we should **enable** the commands with a filter with checking the cmd.default_member_permissions
						const shouldBeRemoved = serializedDbCmds.filter((cmd) => {
							return cmd.default_member_permissions === undefined;
						});
						for (const cmd of shouldBeRemoved) {
							logger.trace(`Disabling command ${cmd.name} for guild ${guild.name}`);
							cmd.default_member_permissions =
								Djs.PermissionFlagsBits.Administrator.toString();
						}
					}
					guildCommands = guildCommands.concat(serializedDbCmds);

					logger.trace(`Registering commands for \`${guild.name}\``);
					if (guild.id === PRIVATE_ID) {
						guildCommands = guildCommands.concat(
							PRIVATES_COMMANDS.map((x) => x.data.toJSON())
						);
					}
					await guild.commands.set(guildCommands);
				}

				const cachePromises = [
					fetchAllCharacter(client, guild),
					cacheStatisticalTemplate(client, guild),
				];

				convertDatabaseUser(client.settings, guild);

				await Promise.all(cachePromises);
				logger.info(`Commands and data processed for ${guild.name}`);
			} catch (error) {
				logger.error(`Failed to process guild ${guild.name}:`, error);
			}
		});

		await Promise.all(guildPromises);

		important.info("Bot is ready");
		logger.info(
			"Invite link: https://discord.com/api/oauth2/authorize?client_id=" +
				process.env.CLIENT_ID +
				"&permissions=8&scope=bot%20applications.commands"
		);
		cleanData(client);
		if (process.env.NODE_ENV === "development") client.template = dev(client.template);
	});
};

/**
 * Migrates user data for a guild to the updated message ID format if not already converted.
 *
 * For each user in the guild, updates character entries with a legacy `messageId` field to use the new array format, associating the message with either a private or default channel. Removes entries that cannot be updated due to missing channel information. Marks the guild as converted upon completion.
 *
 * @param db - The settings database instance.
 * @param guild - The Discord guild whose user data will be migrated.
 */
function convertDatabaseUser(db: Settings, guild: Djs.Guild) {
	if (db.get(guild.id, "converted")) return;
	const users = db.get(guild.id, "user");
	if (!users) {
		db.set(guild.id, true, "converted");
		return;
	}
	const defaultChannel = db.get(guild.id, "managerId");
	const privateChannel = db.get(guild.id, "privateChannel");
	for (const [userId, userData] of Object.entries(users)) {
		for (const index in userData) {
			const data = userData[index];
			if (!Array.isArray(data.messageId)) {
				logger.warn(
					`Converting ${userId} => ${JSON.stringify(userData)} in ${guild.name}`
				);
				let toUpdate = false;
				if (data.isPrivate && privateChannel) {
					data.messageId = [data.messageId, privateChannel];
					toUpdate = true;
				} else if (defaultChannel) {
					toUpdate = true;
					data.messageId = [data.messageId, defaultChannel];
				}
				if (toUpdate) db.set(guild.id, data, `user.${userId}.${index}`);
				else {
					logger.warn(
						`No channel to update for ${userId}/${data.charName} => Deleting it`
					);
					db.delete(guild.id, `user.${userId}.${index}`);
				}
			}
		}
		if (userData.length === 0) db.delete(guild.id, `user.${userId}`);
	}
	db.set(guild.id, true, "converted");
}

/**
 * Fetches and caches the statistical template for a guild.
 *
 * Retrieves the guild's language setting, loads the appropriate localization, fetches the statistical template, and stores it in the client's template cache if found.
 */
async function cacheStatisticalTemplate(client: EClient, guild: Djs.Guild) {
	const lang = client.settings.get(guild.id, "lang") ?? Djs.Locale.EnglishUS;
	const ul = ln(lang);
	const template = await getTemplate(guild, client.settings, ul, client, true, false);
	if (template) client.template.set(guild.id, template);
}
/**
 * Removes settings for guilds the bot is no longer a member of.
 *
 * Iterates through all guild IDs in the settings database and deletes entries for any guilds that are not present in the client's current guild cache.
 */
function cleanData(client: EClient) {
	const guilds = client.guilds.cache;
	const settings = client.settings;
	for (const [guildId] of settings.entries()) {
		if (!guilds.has(guildId)) {
			logger.warn(
				`Removing ${guildId} from the database as the bot is not in it anymore`
			);
			client.settings.delete(guildId);
		}
	}
}

async function fetchAllCharacter(client: EClient, guild: Djs.Guild) {
	const db = client.settings;
	const characters = client.characters;
	const allUsers = db.get(guild.id, "user");
	if (!allUsers) return;
	const userPromises = Object.entries(allUsers).map(async ([userId, chars]) => {
		if (!Array.isArray(chars)) return;
		const characterPromises = chars.map((char) => getUser(char.messageId, guild, client));
		const allCharacters = (await Promise.all(characterPromises)).filter(
			Boolean
		) as UserData[];
		characters.set(guild.id, allCharacters, userId);
	});

	await Promise.all(userPromises);
}
