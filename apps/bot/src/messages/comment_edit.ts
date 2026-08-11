import type { EClient } from "@dicelette/client";
import { replaceRollComment } from "@dicelette/parse_result";
import type { DiscordTextChannel, Translation } from "@dicelette/types";
import { COMMENT_EDIT_PREFIX } from "@dicelette/types";
import { MESSAGE_LINK_PATTERN, ROLL_MENTION_PATTERN } from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError } from "./embeds";

const COPY_WARNING_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Reads the roll-result text of a bot message, regardless of whether it was sent as
 * plain `content` (the common case) or, for results between 2000 and 4000 characters,
 * as a Components V2 text display.
 */
function getRollMessageText(message: Djs.Message): string | undefined {
	if (message.content) return message.content;
	const component = message.components[0];
	if (component?.type === Djs.ComponentType.TextDisplay) return component.content;
	return undefined;
}

async function applyCommentEdit(message: Djs.Message, updated: string): Promise<void> {
	const mentionnedUser = message.mentions.users.map((u) => u.id);
	if (message.content) {
		await message.edit({ allowedMentions: { users: mentionnedUser }, content: updated });
		return;
	}
	await message.edit({
		allowedMentions: { users: mentionnedUser },
		components: [new Djs.TextDisplayBuilder().setContent(updated)],
		flags: [Djs.MessageFlags.IsComponentsV2],
	});
}

/**
 * DMs `rollAuthorId` that a roll-result copy couldn't be located to sync, unless they were
 * already warned about this within the last `COPY_WARNING_COOLDOWN_MS` — otherwise every
 * comment edit on a guild without `linkToLogs` would re-send the same DM.
 */
async function warnCopyNotSynced(
	guildId: string,
	rollAuthorId: string,
	client: EClient,
	ul: Translation
): Promise<void> {
	const warnedAt = client.userSettings.get(guildId, rollAuthorId)?.commentEditWarnedAt;
	if (warnedAt && Date.now() - warnedAt < COPY_WARNING_COOLDOWN_MS) return;

	try {
		const owner = await client.users.fetch(rollAuthorId);
		await owner.send(ul("error.roll.copyNotSynced"));
		client.userSettings.set(guildId, Date.now(), `${rollAuthorId}.commentEditWarnedAt`);
	} catch {
		// The owner has DMs closed or is unreachable — nothing more we can do.
	}
}

/**
 * When a roll is posted outside the dedicated roll channel, `handleRollResult` also posts
 * a copy of the result into a thread. If the guild has `linkToLogs` enabled, the directly
 * replied-to message ends with a link back to that copy — parse it, fetch the copy, and
 * apply the same comment edit to it. Otherwise, if the settings suggest a copy was plausibly
 * made but we have no way to locate it, DM the roll's owner so the mismatch isn't silent.
 */
async function syncThreadCopy(
	original: Djs.Message,
	originalText: string,
	newComment: string,
	rollAuthorId: string,
	client: EClient,
	ul: Translation
): Promise<void> {
	const guild = original.guild;
	if (!guild) return;

	const link = MESSAGE_LINK_PATTERN.exec(originalText)?.groups;
	let copySynced = false;
	let copyExpected = false;

	if (link && link.guildId === guild.id) {
		copyExpected = true;
		try {
			const channel = await client.channels.fetch(link.channelId);
			if (channel?.isTextBased()) {
				const copy = await channel.messages.fetch(link.messageId);
				const copyText = getRollMessageText(copy);
				const copyUpdated = copyText && replaceRollComment(copyText, newComment);
				if (copyUpdated) {
					await applyCommentEdit(copy, copyUpdated);
					copySynced = true;
				}
			}
		} catch {
			// Copy channel/message is gone or unreachable — fall through to the DM warning below.
		}
	} else {
		const channel = original.channel as DiscordTextChannel;
		const channelName = "name" in channel ? (channel.name ?? "") : "";
		const disableThread = client.settings.get(guild.id, "disableThread") === true;
		const isRollChannel =
			client.settings.get(guild.id, "rollChannel") === channel.id ||
			channelName.decode().startsWith("🎲");
		copyExpected = !disableThread && !isRollChannel;
	}

	if (copyExpected && !copySynced)
		await warnCopyNotSynced(guild.id, rollAuthorId, client, ul);
}

/**
 * If `message` is a reply to one of the bot's own roll-result messages and starts with
 * `COMMENT_EDIT_PREFIX`, overwrites that roll's comment with the rest of `message`'s content
 * and edits the original message (and its thread copy, if any) in place.
 *
 * @returns `true` if the reply was recognized as a comment-edit attempt (whether it
 * succeeded or was rejected for permission reasons), `false` otherwise — in which case the
 * caller should keep treating `message` as ordinary input (a new roll, OOC text, etc).
 */
export async function handleCommentEditReply(
	message: Djs.Message,
	client: EClient,
	ul: Translation
): Promise<boolean> {
	if (!message.reference?.messageId) return false;

	const trimmed = message.content.trimStart();
	if (!trimmed.toLowerCase().startsWith(COMMENT_EDIT_PREFIX.toLowerCase())) return false;
	const newComment = trimmed.slice(COMMENT_EDIT_PREFIX.length);

	let original: Djs.Message;
	try {
		original = await message.fetchReference();
	} catch {
		return false;
	}

	if (!original.author.bot || original.author.id !== client.user?.id) return false;

	const originalText = getRollMessageText(original);
	if (!originalText) return false;

	const rollAuthorId = ROLL_MENTION_PATTERN.exec(originalText)?.groups?.id;
	if (!rollAuthorId) return false;

	if (rollAuthorId !== message.author.id) {
		await message.author.send({
			allowedMentions: { repliedUser: true },
			embeds: [embedError(ul("error.roll.notYourRoll"), ul)],
		});
		return true;
	}

	const updated = replaceRollComment(originalText, newComment);
	if (!updated) return true;

	await applyCommentEdit(original, updated);
	await syncThreadCopy(original, originalText, newComment, rollAuthorId, client, ul);

	return true;
}
