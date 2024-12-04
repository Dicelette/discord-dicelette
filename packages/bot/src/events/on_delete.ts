import type { PersonnageIds } from "@dicelette:types/database";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { deleteIfChannelOrThread } from "database/delete_user";
import { sendLogs } from "messages/send";

export const onDeleteChannel = (client: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const guildID = channel.guild.id;
			const db = client.settings;
			deleteIfChannelOrThread(db, guildID, channel);
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
		} catch (error) {
			logger.error(error);
		}
	});
};

export const onDeleteThread = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const db = client.settings;
			//verify if the user message was in the thread
			deleteIfChannelOrThread(db, guildID, thread);
		} catch (error) {
			logger.error(error);
			if (thread.isDMBased()) return;
			await sendLogs((error as Error).message, thread.guild, client.settings);
		}
	});
};
export const onDeleteMessage = (client: EClient): void => {
	client.on("messageDelete", async (message) => {
		try {
			if (!message.guild) return;
			const messageId = message.id;
			//search channelID in database and delete it
			const guildID = message.guild.id;
			const channel = message.channel;
			if (channel.isDMBased()) return;
			if (client.settings.get(guildID, "templateID.messageId") === messageId)
				client.settings.delete(guildID, "templateID");

			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0) {
				for (const [user, values] of Object.entries(dbUser)) {
					for (const [index, value] of values.entries()) {
						const persoId: PersonnageIds = {
							messageId: value.messageId[0],
							channelId: value.messageId[1],
						};
						if (persoId.messageId === messageId && persoId.channelId === channel.id) {
							logger.silly(`Deleted character ${value.charName} for user ${user}`);
							values.splice(index, 1);
						}
					}
					if (values.length === 0) delete dbUser[user];
				}
			}
			client.settings.set(guildID, dbUser, "user");
		} catch (error) {
			if (!message.guild) return;
			await sendLogs((error as Error).message, message.guild, client.settings);
		}
	});
};
