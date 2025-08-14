import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { commandsList, contextMenus, helpAtInvit } from "commands";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			client.characters.set(guild.id, {});
			client.template.set(guild.id, {});

			const commandPromises = commandsList.map(async (command) => {
				await guild.commands.create(command.data);
				logger.trace(`Command ${command.data.name} created in ${guild.name}`);
				return command.data.name;
			});

			const contextMenuPromises = contextMenus.map(async (contextMenu) => {
				await guild.commands.create(contextMenu);
				return contextMenu.name;
			});
			await Promise.all([...commandPromises, ...contextMenuPromises]);

			client.settings.set(guild.id, true, "converted");
			await helpAtInvit(guild);
		} catch (e) {
			logger.fatal(e);
		}
	});
};
