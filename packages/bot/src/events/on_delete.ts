import type { EClient } from "@dicelette/client";
import type { PersonnageIds } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { DATABASE_NAMES } from "commands";
import { deleteIfChannelOrThread, deleteUserInChar } from "database";
import * as Djs from "discord.js";
import { saveCount, sendLogs } from "messages";

export const onDeleteChannel = (client: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const guildID = channel.guild.id;
			await deleteIfChannelOrThread(client, guildID, channel);
		} catch (error) {
			logger.error(error);
			if (channel.isDMBased()) return;
			await sendLogs((error as Error).message, channel.guild, client.settings);
		}
	});
};
export const onKick = (client: EClient): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		try {
			client.settings.delete(guild.id);
			client.characters.delete(guild.id);
			client.template.delete(guild.id);
			client.criticalCount.delete(guild.id);
			client.userSettings.delete(guild.id);
		} catch (error) {
			logger.error(error);
		}
	});
};

export const onUserQuit = (client: EClient): void => {
	client.on("guildMemberRemove", (member) => {
		if (client.criticalCount.has(member.guild.id, member.id))
			client.criticalCount.delete(member.guild.id, member.id);
		if (client.userSettings.has(member.guild.id, member.id))
			client.userSettings.delete(member.guild.id, member.id);
	});
};

export const onDeleteThread = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			//verify if the user message was in the thread
			await deleteIfChannelOrThread(client, guildID, thread);
		} catch (error) {
			logger.error(error);
			if (thread.isDMBased()) return;
			await sendLogs((error as Error).message, thread.guild, client.settings);
		}
	});
};

export async function addRestriction(client: EClient, guildId: string) {
	const guildCommmands = await client.application?.commands.fetch({ guildId });
	const cmds = guildCommmands?.filter((cmd) => DATABASE_NAMES.includes(cmd.name));
	/*
	for (const cmd of cmds?.values() ?? []) {
		await cmd.edit({ defaultMemberPermissions: Djs.PermissionFlagsBits.Administrator });
	}
	logger.trace("Restrictions added to commands for guild", guildId);
	*/
	//convert to promise to be faster
	await Promise.all(
		cmds?.map(async (cmd) => {
			logger.trace("Adding defaultMemberPermissions to command", cmd.name);
			await cmd.edit({ defaultMemberPermissions: Djs.PermissionFlagsBits.Administrator });
		}) ?? []
	);
}
export const onDeleteMessage = (client: EClient): void => {
	client.on("messageDelete", async (message) => {
		try {
			if (!message.guild) return;
			const messageId = message.id;
			if (message.author?.bot && message.author.id === client.user?.id) {
				saveCount(message, client.criticalCount, message.guild.id, client, "remove");
				// Clean up cache entry after processing
				if (client.settings.get(message.guild.id, "pity")) {
					const timeMin = Math.floor(message.createdTimestamp / 60000);
					const cacheKey = `${message.guild.id}:${message.author.id}:${timeMin}`;
					const prevCacheKey = `${message.guild.id}:${message.author.id}:${timeMin - 1}`;
					client.trivialCache.delete(cacheKey);
					client.trivialCache.delete(prevCacheKey);
				}
			}

			//search channelID in database and delete it
			const guildID = message.guild.id;
			const channel = message.channel;
			if (channel.isDMBased()) return;
			if (client.settings.get(guildID, "templateID.messageId") === messageId) {
				client.settings.delete(guildID, "templateID");
				client.template.delete(guildID); //template is deleted
				await addRestriction(client, guildID);
			}

			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0) {
				for (const [user, values] of Object.entries(dbUser)) {
					for (const [index, value] of values.entries()) {
						const persoId: PersonnageIds = {
							channelId: value.messageId[1],
							messageId: value.messageId[0],
						};
						if (persoId.messageId === messageId && persoId.channelId === channel.id) {
							logger.info(`Deleted character ${value.charName} for user ${user}`);
							values.splice(index, 1);
							//delete in characters database
							deleteUserInChar(client.characters, user, guildID, value.charName);
						}
					}
					if (values.length === 0) delete dbUser[user];
				}
			}
			client.settings.set(guildID, dbUser, "user");
		} catch (error) {
			logger.warn(error);
			if (!message.guild) return;
			await sendLogs((error as Error).message, message.guild, client.settings);
		}
	});
};
