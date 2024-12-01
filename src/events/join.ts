import { commandsList } from "@commands";
import { contextMenus } from "@commands/context-menu";
import { logger } from "@logger";
import type { EClient } from "@main";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
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
