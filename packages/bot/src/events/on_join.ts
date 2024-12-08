import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { commandsList, contextMenus } from "commands";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			client.characters.set(guild.id, {});
			for (const command of commandsList) {
				await guild.commands.create(command.data);
				logger.trace(`Command ${command.data.name} created in ${guild.name}`);
				client.settings.set(guild.id, true, "converted");
			}
			for (const contextMenu of contextMenus) {
				await guild.commands.create(contextMenu);
			}
		} catch (e) {
			logger.fatal(e);
		}
	});
};
