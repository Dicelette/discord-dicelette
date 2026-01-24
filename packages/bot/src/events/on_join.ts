import type { EClient } from "@dicelette/client";
import { logger } from "@dicelette/utils";
import { GUILD_ONLY_COMMANDS, helpAtInvit } from "commands";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			client.characters.set(guild.id, {});
			client.template.set(guild.id, {});
			client.settings.set(guild.id, true, "converted");
			client.settings.set(guild.id, true, "disableThread");
			client.criticalCount.set(guild.id, {});
			client.userSettings.set(guild.id, {});
			const serializedDbCmds = GUILD_ONLY_COMMANDS.map((command) =>
				command.data.toJSON()
			);
			await guild.commands.set(serializedDbCmds);
			logger.info(
				`Guild commands added for ${guild.name} (${guild.id}) - Total: ${serializedDbCmds.length}`
			);
			await helpAtInvit(guild);
		} catch (e) {
			logger.fatal(e);
		}
	});
};
