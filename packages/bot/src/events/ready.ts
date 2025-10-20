// noinspection ES6MissingAwait
/** biome-ignore-all lint/suspicious/noTsIgnore: let me alone */

import process from "node:process";
import { ln } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { dev, important, logger } from "@dicelette/utils";
import type { EClient } from "client";
import {
	COMMANDS,
	contextMenus,
	DATABASE_COMMANDS,
	GLOBAL_CMD,
	PRIVATES_COMMANDS,
} from "commands";
import { getTemplate, getUser } from "database";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { PRIVATE_ID, VERSION } from "../../index";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

export default (client: EClient): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;
		logger.trace(`${client.user.username} is online; v.${VERSION}`);
		let serializedCommands = COMMANDS.map((command) => command.data.toJSON()).filter(
			(x) => (x.contexts ? x.contexts.includes(Djs.InteractionContextType.Guild) : true)
		);
		const serializedDbCmds = DATABASE_COMMANDS.map((command) => command.data.toJSON());

		client.user.setActivity("Bringing chaos !", {
			type: Djs.ActivityType.Playing,
		});
		serializedCommands = serializedCommands.concat(
			//@ts-ignore
			contextMenus.map((cmd) => cmd.toJSON())
		);

		const guildPromises = Array.from(client.guilds.cache.values()).map(async (guild) => {
			let guildCommands = [...serializedCommands];

			const enabled = client.settings.get(guild.id, "templateID.messageId");
			if (enabled) {
				for (const cmd of serializedDbCmds) {
					cmd.default_member_permissions = undefined;
				}
				guildCommands = guildCommands.filter(
					(cmd) => !serializedDbCmds.find((c) => c.name === cmd.name)
				);
				guildCommands = guildCommands.concat(serializedDbCmds);
			}

			logger.trace(`Registering commands for \`${guild.name}\``);
			if (guild.id === PRIVATE_ID) {
				guildCommands = guildCommands.concat(
					PRIVATES_COMMANDS.map((x) => x.data.toJSON())
				);
			}
			try {
				await guild.commands.set(guildCommands);

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
		await client.application?.commands.set(GLOBAL_CMD.map((cmd) => cmd.data.toJSON()));

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
	const template = await getTemplate(guild, client.settings, ul, true);
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
		const characterPromises = chars.map(async (char) => {
			return await getUser(char.messageId, guild, client);
		});
		const allCharacters = (await Promise.all(characterPromises)).filter(
			Boolean
		) as UserData[];
		characters.set(guild.id, allCharacters, userId);
	});

	await Promise.all(userPromises);
}
