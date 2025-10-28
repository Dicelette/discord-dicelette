import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";

export type ModerationKind = "stats-edit" | "dice-edit" | "dice-add";

export type ModerationCacheValue =
	| {
			kind: "stats-edit" | "dice-edit";
			embed: Djs.EmbedBuilder;
			meta: { userID: string; userName?: string; channelId: string; messageId: string };
	  }
	| {
			kind: "dice-add";
			embeds: Djs.EmbedBuilder[];
			meta: { userID: string; userName?: string; channelId: string; messageId: string };
	  };

const cache = new Map<string, ModerationCacheValue>();

export function makeEmbedKey(guildId: string, channelId: string, messageId: string) {
	return `${guildId}:${channelId}:${messageId}`;
}

export function parseEmbedKey(
	key: string
): { guildId: string; channelId: string; messageId: string } | undefined {
	const parts = key.split(":");
	if (parts.length !== 3) return undefined;
	const [guildId, channelId, messageId] = parts;
	if (!guildId || !channelId || !messageId) return undefined;
	return { guildId, channelId, messageId };
}

export function putModerationCache(key: string, value: ModerationCacheValue) {
	cache.set(key, value);
}

export function getModerationCache(key: string) {
	return cache.get(key);
}

export function deleteModerationCache(key: string) {
	cache.delete(key);
}

// CustomId helpers (prefixes remain aligned with current routing)
export const CUSTOM_ID_PREFIX = {
	stats: { validate: "modo_stats_validation_", cancel: "modo_stats_cancel_" },
	diceEdit: { validate: "modo_dice_validation_", cancel: "modo_dice_cancel_" },
	diceAdd: { validate: "modo_dice_add_validation_", cancel: "modo_dice_add_cancel_" },
} as const;

export function buildCustomId(prefix: string, key: string) {
	return `${prefix}${key}`;
}

export function parseKeyFromCustomId(prefix: string, customId: string) {
	return customId.startsWith(prefix) ? customId.slice(prefix.length) : "";
}

export function buildModerationButtons(
	kind: ModerationKind,
	ul: Translation,
	embedKey: string
) {
	const group =
		kind === "stats-edit"
			? CUSTOM_ID_PREFIX.stats
			: kind === "dice-edit"
				? CUSTOM_ID_PREFIX.diceEdit
				: CUSTOM_ID_PREFIX.diceAdd;

	const approve = new Djs.ButtonBuilder()
		.setCustomId(buildCustomId(group.validate, embedKey))
		.setLabel(ul("button.validate"))
		.setStyle(Djs.ButtonStyle.Success)
		.setEmoji("✅");

	const cancel = new Djs.ButtonBuilder()
		.setCustomId(buildCustomId(group.cancel, embedKey))
		.setLabel(ul("common.cancel"))
		.setStyle(Djs.ButtonStyle.Secondary)
		.setEmoji("❌");

	return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents([approve, cancel]);
}

// Footer helpers for storing/retrieving moderation metadata on embeds
export type ModerationFooter = {
	userID: string;
	userName?: string;
	channelId: string;
	messageId: string;
};

export function setModerationFooter(embed: Djs.EmbedBuilder, data: ModerationFooter) {
	embed.setFooter({ text: JSON.stringify(data) });
}

export function getModerationFooter(
	embed: Djs.EmbedBuilder
): ModerationFooter | undefined {
	const text = embed.data.footer?.text;
	if (!text) return undefined;
	try {
		return JSON.parse(text) as ModerationFooter;
	} catch {
		return undefined;
	}
}
