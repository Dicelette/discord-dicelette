import { fetchChannel } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import type { DiscordTextChannel, StripOOC, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import * as Djs from "discord.js";
import { deleteAfter } from "./send";
import { fetchThread, setTags } from "./thread";

// Cache for compiled regex patterns to avoid recompilation
const REGEX_CACHE = new Map<string, RegExp>();

/**
 * Get or create a cached regex pattern
 */
function getCachedRegex(pattern: string, flags: string): RegExp {
	const key = `${pattern}|${flags}`;
	let regex = REGEX_CACHE.get(key);
	if (!regex) {
		regex = new RegExp(pattern, flags);
		REGEX_CACHE.set(key, regex);
	}
	return regex;
}

export async function stripOOC(message: Djs.Message, client: EClient, ul: Translation) {
	if (message.author.bot) return;
	if (!message.guild) return;
	const stripOoc = client.settings.get(message.guild.id, "stripOOC");
	const channelsAllowed = stripOoc?.categoryId;
	const channel = message.channel as DiscordTextChannel;
	if (channel.name.startsWith("📄")) return;
	const parent = channel.parent;
	const grandParent = parent?.parent;

	if (
		![message.channel.id, parent?.id, grandParent?.id].some(
			(id) => id && channelsAllowed?.includes(id)
		)
	)
		return;

	if (!stripOoc || stripOoc?.timer === 0 || !stripOoc?.regex) return;
	const timer = stripOoc.timer;
	if (!timer) return;
	const regex = getCachedRegex(stripOoc.regex, "i");
	if (regex.test(message.content)) {
		if (stripOoc.forwardId || stripOoc.threadMode)
			await forwardOoc(message, stripOoc, regex, ul);

		await deleteAfter(message, timer);
	}
	return;
}

function replaceOOC(regex: RegExp, message: string) {
	const reg = regex.exec(message);
	if (!reg) return message;
	return message.replace(regex, reg[reg.length - 1]).trim();
}

async function findOrCreateOoc(msgChannel: DiscordTextChannel, ul: Translation) {
	if (msgChannel.isThread()) {
		if (msgChannel.name.startsWith("📄")) return msgChannel;
		//search for a thread with the "📄 OOC" prefix & same parent
		if (msgChannel.parent?.isTextBased()) {
			const thread = await fetchThread(msgChannel.parent);
			if (thread) return thread;
			return await msgChannel.parent.threads.create({
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneDay,
				name: `📄 ${ul("common.ooc")}`,
				reason: "Creating OOC thread",
			});
		}
		if (msgChannel.parent?.type === Djs.ChannelType.GuildForum) {
			logger.trace("Creating OOC thread in forum channel");
			const thread = await fetchThread(msgChannel.parent);
			if (thread) return thread;
			const tags = await setTags(msgChannel.parent, ul("common.ooc"), "📄");
			return await msgChannel.parent.threads.create({
				appliedTags: [tags.id as string],
				autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneDay,
				message: { content: `${ul("common.ooc")} - ${msgChannel.name}` },
				name: `📄 ${ul("common.ooc")} - ${msgChannel.name}`,
				reason: "Creating OOC thread",
			});
		}
	}
	if (msgChannel.type === Djs.ChannelType.GuildText) {
		const thread = await fetchThread(msgChannel);
		if (thread) return thread;
		return await msgChannel.threads.create({
			autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneDay,
			name: `📄${ul("common.ooc")}`,
			reason: "Creating OOC thread",
		});
	}
}

async function forwardOoc(
	message: Djs.Message,
	config: Partial<StripOOC>,
	regex: RegExp,
	ul: Translation
) {
	logger.trace("Forwarding OOC message", message.content);
	const forward = new Djs.EmbedBuilder()
		.setAuthor({
			iconURL: message.member?.displayAvatarURL() ?? message.author.displayAvatarURL(),
			name:
				message.member?.displayName ??
				message.author.globalName ??
				message.author.username,
		})
		.setDescription(
			replaceOOC(regex, message.content) +
				"\n\n-# ↪ " +
				Djs.channelMention(message.channelId)
		)
		.setTimestamp(message.createdTimestamp);
	if (config.forwardId) {
		const channel = await fetchChannel(message.guild!, config.forwardId);
		if (channel?.isTextBased()) {
			await channel.send({ embeds: [forward] });
			return;
		}
		logger.warn(
			`Invalid forward channel ID: ${config.forwardId} in guild ${message.guild!.id}`
		);
		return;
	}
	if (config.threadMode) {
		const thread = await findOrCreateOoc(message.channel as DiscordTextChannel, ul);
		if (thread) {
			await thread.send({ embeds: [forward] });
			return;
		}
		logger.warn(
			`Failed to create or find thread in guild ${message.guild!.id} for OOC forwarding`
		);
		return;
	}
}
