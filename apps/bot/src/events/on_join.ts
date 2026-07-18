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
			logger.fatal(e as Error);
		}
	});
};

export const onMemberJoin = (client: EClient): void => {
	client.on("guildMemberAdd", async (member) => {
		logger.trace(`Member joined: ${member.displayName}`);
		const guildId = member.guild.id;
		const memberId = member.id;
		if (!client.characters.has(guildId, memberId)) {
			logger.trace("User doesn't have characters in cache");
			const chars = client.settings.get(guildId, `user.${memberId}`);
			if (!chars?.length) return;
			logger.trace(
				`Found ${chars.length} characters for user ${member.displayName} in settings, fetching...`
			);
			const allChar = (
				await mapConcurrent(chars, 10, (char) =>
					getUser(char.messageId, member.guild, client)
				)
			).filter((x) => x != null);
			if (!allChar.length) return;
			client.characters.set(guildId, allChar, memberId);
			client.characterCacheTimestamps.set(`${guildId}:${memberId}`, Date.now());
			logger.trace(
				`Cached ${allChar.length} characters for user ${member.displayName} (${memberId}) in guild ${member.guild.name} (${guildId})`
			);
		}
	});
};
