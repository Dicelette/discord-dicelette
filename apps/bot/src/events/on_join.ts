import type { EventEmitter } from "node:events";
import type { EClient } from "@dicelette/client";
import { logger, mapConcurrent } from "@dicelette/utils";
import { GUILD_ONLY_COMMANDS, helpAtInvit } from "commands";
import { getUser } from "../database";

export default (client: EClient, guildEvents?: EventEmitter): void => {
	client.on("guildCreate", async (guild) => {
		guildEvents?.emit("guildCreate", guild.id);
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

export const onMemberJoin = (client: EClient): void => {
	client.on("guildMemberAdd", async (member) => {
		const guildId = member.guild.id;
		const memberId = member.id;
		if (!client.characters.has(guildId, memberId)) {
			const chars = client.settings.get(guildId, `user.${memberId}`);
			if (!chars?.length) return;
			const allChar = (
				await mapConcurrent(chars, 10, (char) =>
					getUser(char.messageId, member.guild, client)
				)
			).filter((x) => x != null);
			if (!allChar.length) return;
			client.characters.set(guildId, allChar, memberId);
			client.characterCacheTimestamps.set(`${guildId}:${memberId}`, Date.now());
		}
	});
};
