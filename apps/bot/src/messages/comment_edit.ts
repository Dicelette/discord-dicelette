import type { EClient } from "@dicelette/client";
import { replaceRollComment } from "@dicelette/parse_result";
import type { DiscordTextChannel, Translation } from "@dicelette/types";
import { COMMENT_EDIT_PREFIX } from "@dicelette/types";
import {
	createRegexFromText,
	isRegex,
	MESSAGE_LINK_PATTERN,
	ROLL_MENTION_PATTERN,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import { embedError } from "./embeds";

const COPY_WARNING_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Reads the roll-result text of a bot message
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
 * DMs `rollAuthorId` that a roll-result copy couldn't be located to sync, unless they were already warned about this within the last `COPY_WARNING_COOLDOWN_MS`
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
 * Apply the content edit within thread if needed
 * If cannot, send a DM to the user so it knows that the edit could be synced
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

/** Edits or adds a comment on a dice roll from a reply starting with {@link COMMENT_EDIT_PREFIX}; only works on
 * the replier's own roll (checked via the @mention). */
export async function handleCommentEditReply(
	message: Djs.Message,
	client: EClient,
	ul: Translation
): Promise<boolean> {
	if (!message.reference?.messageId) return false;

	const trimmed = message.content.trimStart();
	const prefix = client.userSettings.get(
		message.guild?.id ?? "",
		message.author.id
	)?.prefixEditComment;
	//3 cas :
	// - undefined (=> on retourne sur COMMENT_EDIT_PREFIX)
	// - regex (commence et termine par /)
	// - string (simple text => commence par ce texte)
	// En soit, pour les deux derniers cas, on peut juste faire un regex commun => ^(prefixEditComment|COMMENT_EDIT_PREFIX) ou regex pour le regex
	let regex: RegExp | undefined = new RegExp(`^${COMMENT_EDIT_PREFIX}`);
	if (prefix) {
		if (isRegex(prefix)) {
			regex = createRegexFromText(prefix);
		} else regex = new RegExp(`^${prefix}`);
	}

	if (!trimmed.toLowerCase().match(regex)) return false;
	const newComment = trimmed.replace(regex, "");

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
