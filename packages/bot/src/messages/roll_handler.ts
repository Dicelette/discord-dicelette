import type { EClient } from "@dicelette/client";
import type { ComparedValue, Critical, CustomCritical, Resultat } from "@dicelette/core";
import { ResultAsText } from "@dicelette/parse_result";
import type { DiscordTextChannel, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { deleteAfter, findMessageBefore, threadToSend } from "messages";

interface RollHandlerOptions {
	/** Result of the dice roll */
	result: Resultat;
	/** Language for messages */
	lang: Djs.Locale;
	/** Translation function */
	ul: Translation;
	/** If true and source is an interaction, reply ephemerally */
	hideResult?: boolean;
	/** Server critical settings (simple success/failure thresholds) */
	serverCritical?: Critical;
	/** Character name */
	charName?: string;
	/** Additional info about the roll */
	infoRoll?: { name: string; standardized: string } | string;
	/** Custom criticals from dice formula */
	criticalsFromDice?: Record<string, CustomCritical>;
	/** Opposition/comparator data */
	opposition?: ComparedValue;
	/** Should delete the original message */
	deleteInput?: boolean;
	/** Original message or interaction */
	source: Djs.Message | Djs.CommandInteraction;
	/** Bot client */
	client: EClient;
	/** User who initiated the roll (defaults to message/interaction author) */
	user?: Djs.User;
	/** Link to logs message URL */
	logUrl?: string;
}

/**
 * Handles the complete flow of sending a dice roll result:
 * - Creates ResultAsText
 * - Determines channel/thread destination
 * - Handles roll channels vs regular channels
 * - Manages thread creation and log forwarding
 * - Applies delete timers
 * - Returns the sent message for further processing
 */
export async function handleRollResult(
	opts: RollHandlerOptions
): Promise<Djs.Message | Djs.InteractionResponse | undefined> {
	const {
		result,
		lang,
		ul,
		hideResult,
		serverCritical,
		charName,
		infoRoll,
		criticalsFromDice,
		opposition,
		deleteInput = false,
		source,
		client,
		user,
		logUrl,
	} = opts;

	const resultAsText = new ResultAsText(
		result,
		{ lang },
		serverCritical,
		charName,
		typeof infoRoll === "string" ? undefined : infoRoll,
		criticalsFromDice,
		opposition
	);

	const parser = resultAsText.parser;
	if (!parser) return;

	const guild = source instanceof Djs.Message ? source.guild : source.guild;
	if (!guild) return;

	const channel =
		source instanceof Djs.Message
			? source.channel
			: (source.channel as Djs.TextChannel | null);
	if (!channel || channel.type === Djs.ChannelType.DM) return;
	if (channel.type === Djs.ChannelType.GroupDM) return;

	const author = user ?? (source instanceof Djs.Message ? source.author : source.user);

	const channelName = channel.name ?? "";
	const isRollChannel =
		client.settings.get(guild.id, "rollChannel") === channel.id ||
		channelName.decode().startsWith("🎲");

	const disableThread = client.settings.get(guild.id, "disableThread") === true;

	// Simple reply in roll channel or when threads are disabled
	if (isRollChannel || disableThread) {
		const reply = await replyToSource(
			source,
			resultAsText,
			author.id,
			logUrl,
			deleteInput,
			hideResult
		);
		if (deleteInput && source instanceof Djs.Message) await source.delete();
		return reply;
	}

	// Complex flow: thread + context
	const useContext = client.settings.get(guild.id, "context");
	let messageId = source instanceof Djs.Message ? source.id : "";

	// Find message before for context if needed
	if (deleteInput && useContext && source instanceof Djs.Message) {
		const messageBefore = await findMessageBefore(
			channel as DiscordTextChannel,
			source,
			client
		);
		if (messageBefore) {
			messageId = messageBefore.id;
		}
	}

	const context = {
		channelId: channel.id,
		guildId: guild.id,
		messageId,
	};

	// Send to thread
	const thread = await threadToSend(
		client.settings,
		channel as Exclude<typeof channel, Djs.PartialGroupDMChannel>,
		ul
	);
	const msgToEdit = await thread.send("_ _");
	const msgWithContext = resultAsText.onMessageSend(context, author.id);
	await msgToEdit.edit(msgWithContext);

	// Get log URL if enabled
	const idMessage = client.settings.get(guild.id, "linkToLogs")
		? msgToEdit.url
		: undefined;

	// Reply to user
	const reply = await replyToSource(
		source,
		resultAsText,
		author.id,
		idMessage,
		deleteInput,
		hideResult
	);

	// Apply delete timer
	const timer = client.settings.get(guild.id, "deleteAfter") ?? 180000;
	await deleteAfter(reply, timer);

	// Delete original message if needed
	if (deleteInput && source instanceof Djs.Message) await source.delete();

	return reply;
}

/**
 * Helper to reply to either a Message or CommandInteraction
 */
async function replyToSource(
	source: Djs.Message | Djs.CommandInteraction,
	resultAsText: ResultAsText,
	authorId: string,
	idMessage?: string,
	deleteInput = false,
	hideResult?: boolean
): Promise<Djs.Message | Djs.InteractionResponse> {
	const content = resultAsText.onMessageSend(idMessage, authorId);

	if (source instanceof Djs.Message) {
		const channel = source.channel as DiscordTextChannel;
		return deleteInput
			? await channel.send({ content })
			: await source.reply({
					allowedMentions: { repliedUser: true },
					content,
				});
	}

	// CommandInteraction
	if (source.replied || source.deferred) {
		return await source.editReply({ content });
	}
	return await source.reply({
		allowedMentions: { repliedUser: true },
		content,
		flags: hideResult ? Djs.MessageFlags.Ephemeral : undefined,
	});
}
