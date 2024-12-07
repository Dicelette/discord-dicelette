// noinspection ES6MissingAwait

import type { Settings } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { commandsList, contextMenus } from "commands";
import * as Djs from "discord.js";
import type { Guild } from "discord.js";
import dotenv from "dotenv";
import { VERSION } from "../../index.js";
dotenv.config({ path: ".env" });

const rest = new Djs.REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;

		logger.trace(`${client.user.username} is online; v.${VERSION}`);
		let serializedCommands = commandsList.map((command) => command.data.toJSON());
		client.user.setActivity("Roll Dices 🎲 !", { type: Djs.ActivityType.Competing });
		serializedCommands = serializedCommands.concat(
			//@ts-ignore
			contextMenus.map((cmd) => cmd.toJSON())
		);
		for (const guild of client.guilds.cache.values()) {
			logger.trace(`Registering commands for \`${guild.name}\``);
			const cmds = await guild.client.application.commands.fetch({ guildId: guild.id });
			//filter the list of the commands that are deleted
			// biome-ignore lint/complexity/noForEach: <explanation
			cmds.forEach(async (command) => {
				if (serializedCommands.find((c) => c.name === command.name)) return;
				try {
					await command.delete();
				} catch (e) {
					logger.warn(`Error while deleting command ${command.name} in ${guild.name}`);
				}
			});

			await rest.put(
				Djs.Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
				{
					body: serializedCommands,
				}
			);

			convertDatabaseUser(client.settings, guild);
		}
		cleanData(client);
	});
};

function convertDatabaseUser(db: Settings, guild: Guild) {
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
					console.warn(
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
