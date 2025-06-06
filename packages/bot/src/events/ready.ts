// noinspection ES6MissingAwait

import process from "node:process";
import { ln } from "@dicelette/localization";
import type { Settings, UserData } from "@dicelette/types";
import { dev, important, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { commandsList, contextMenus, dbCmd } from "commands";
import { getTemplate, getUser } from "database";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { VERSION } from "../../index";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

const rest = new Djs.REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;

		logger.trace(`${client.user.username} is online; v.${VERSION}`);
		let serializedCommands = commandsList.map((command) =>
			command.data.toJSON(),
		);
		const serializedDbCmds = dbCmd.map((command) => command.data.toJSON());

		client.user.setActivity("Roll Dices 🎲 !", {
			type: Djs.ActivityType.Competing,
		});
		serializedCommands = serializedCommands.concat(
			//@ts-ignore
			contextMenus.map((cmd) => cmd.toJSON()),
		);

		for (const guild of client.guilds.cache.values()) {
			//remove admin commands

			const enabled = client.settings.get(guild.id, "templateID.messageId");
			if (enabled) {
				for (const cmd of serializedDbCmds) {
					cmd.default_member_permissions = undefined;
				}
				//replace in serializedCommands the db commands
				serializedCommands = serializedCommands.filter(
					(cmd) => !serializedDbCmds.find((c) => c.name === cmd.name),
				);
				serializedCommands = serializedCommands.concat(serializedDbCmds);
			}

			logger.trace(`Registering commands for \`${guild.name}\``);
			const cmds = await guild.client.application.commands.fetch({
				guildId: guild.id,
			});
			//filter the list of the commands that are deleted
			cmds.forEach(async (command) => {
				if (serializedCommands.find((c) => c.name === command.name)) return;
				try {
					await command.delete();
				} catch (e) {
					logger.warn(
						`Error while deleting command ${command.name} in ${guild.name}`,
					);
				}
			});

			await rest.put(
				Djs.Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
				{
					body: serializedCommands,
				},
			);

			convertDatabaseUser(client.settings, guild);
			logger.info(`User saved in memory for ${guild.name}`);
			await fetchAllCharacter(client, guild);
			await cacheStatisticalTemplate(client, guild);
			logger.info(`Template saved in memory for ${guild.name}`);
		}
		important.info("Bot is ready");
		cleanData(client);
		if (process.env.NODE_ENV === "development")
			client.template = dev(client.template);
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
					`Converting ${userId} => ${JSON.stringify(userData)} in ${guild.name}`,
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
						`No channel to update for ${userId}/${data.charName} => Deleting it`,
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
				`Removing ${guildId} from the database as the bot is not in it anymore`,
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
	for (const [userId, chars] of Object.entries(allUsers)) {
		const allCharacters: UserData[] = [];
		if (!Array.isArray(chars)) continue;
		for (const char of chars) {
			const userStats = await getUser(char.messageId, guild, client);
			if (userStats) allCharacters.push(userStats);
		}
		characters.set(guild.id, allCharacters, userId);
	}
}
