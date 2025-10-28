import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import { COMMANDS, contextMenus, helpAtInvit } from "commands";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			client.characters.set(guild.id, {});
			client.template.set(guild.id, {});
			client.settings.set(guild.id, true, "converted");
			client.settings.set(guild.id, true, "disableThread");
			client.criticalCount.set(guild.id, {});

			const allCommands = [...COMMANDS.map((command) => command.data), ...contextMenus];

			await guild.commands.set(allCommands);

			await helpAtInvit(guild);
		} catch (e) {
			logger.fatal(e);
		}
	});
};
