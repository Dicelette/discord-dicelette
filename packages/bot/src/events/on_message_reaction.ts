import { ln } from "@dicelette/localization";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";

export const onReactionAdd = (client: EClient): void => {
	client.on(Djs.Events.MessageReactionAdd, async (reaction, user) => {
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error("Something went wrong when fetching the message: ", error);
				return;
			}
		}
		logger.trace(
			`${user.globalName} reacted with "${reaction.emoji.name}" on message ${reaction.message.id}`
		);
		if (!reaction.message.guild) return;
		if (reaction.message.author?.id !== client.user?.id) return;
		//two behavior here
		//1. Send the result to the user in DM
		//2. Copy the reaction to the saved message ONLY if the message contains the link to the saved message
		if (reaction.emoji.name === "📩") {
			await sendRollToDM(reaction, user);
			//remove reaction
			await reaction.remove();
			return;
		}
		if (reaction.emoji.name === "🔗") {
			//add button to the message
			logger.trace("Adding button 🔗 to the message");
			const lang =
				client.settings.get(reaction.message.guild.id, "lang") ??
				reaction.message.guild?.preferredLocale ??
				"en";
			const ul = ln(lang);
			const copyResButtonDesktop = new Djs.ButtonBuilder()
				.setCustomId("copyResult_desktop")
				.setStyle(Djs.ButtonStyle.Secondary)
				.setLabel(ul("copyRollResult.name"))
				.setEmoji("🖥");

			const copyResButtonMobile = new Djs.ButtonBuilder()
				.setCustomId("copyResult_mobile")
				.setStyle(Djs.ButtonStyle.Secondary)
				.setLabel(ul("copyRollResult.name"))
				.setEmoji("📱");
			const message = await reaction.message.fetch();
			await message.edit({
				components: [
					new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
						copyResButtonDesktop,
						copyResButtonMobile
					),
				],
			});
			//remove reaction
			await reaction.remove();
			return;
		}
		await copyReaction(reaction);
	});
};

async function sendRollToDM(
	reaction: Djs.MessageReaction | Djs.PartialMessageReaction,
	user: Djs.User | Djs.PartialUser
) {
	let message: Djs.Message | Djs.PartialMessage | undefined =
		await getSavedMessage(reaction);
	if (!message) {
		message = reaction.message;
	}
	if (!message || !message.content) return;
	if (!user || user.bot) return;
	await user.send({ content: message.content });
}

async function getSavedMessage(
	reaction: Djs.MessageReaction | Djs.PartialMessageReaction
) {
	const message = reaction.message;
	if (!message || !message.content) return;
	const regexChannel = new RegExp(
		`-# ↪ https:\\/\\/discord.com\\/channels\\/${reaction.message!.guild!.id}\\/(?<channelID>\\d+)\\/(?<messageID>\\d+)\\/?`,
		"gi"
	);
	const match = regexChannel.exec(message.content);
	if (!match || !match.groups) return;
	const channelID = match.groups.channelID;
	const messageID = match.groups.messageID;
	const channel = await reaction.message.guild?.channels.fetch(channelID);
	if (!channel || !channel.isTextBased || channel instanceof Djs.CategoryChannel) return;
	return await channel.messages.fetch(messageID);
}

async function copyReaction(reaction: Djs.MessageReaction | Djs.PartialMessageReaction) {
	const messageToCopy = await getSavedMessage(reaction);
	if (!messageToCopy) return;
	try {
		await messageToCopy.react(reaction.emoji);
	} catch (error) {
		logger.trace(error);
	}
}

export const onReactionRemove = (client: EClient): void => {
	client.on(Djs.Events.MessageReactionRemove, async (reaction, user) => {
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error("Something went wrong when fetching the message: ", error);
				return;
			}
		}
		logger.trace(
			`${user.globalName} removed reaction "${reaction.emoji.name}" from message ${reaction.message.id}`
		);
		if (!reaction.message.guild) return;
		if (reaction.message.author?.id !== client.user?.id) return;
		await removeCopiedReaction(reaction, user);
	});
};

async function removeCopiedReaction(
	reaction: Djs.MessageReaction | Djs.PartialMessageReaction,
	user: Djs.User | Djs.PartialUser
) {
	const messageToCopy = await getSavedMessage(reaction);
	if (!messageToCopy) return;
	const reactions = messageToCopy.reactions.cache;
	if (!reactions) return;
	const reactionToRemove = reaction.emoji.name ?? reaction.emoji.id;
	if (!reactionToRemove) return;
	await messageToCopy.reactions.cache
		.get(reactionToRemove)
		?.users.remove(user.client.user!.id);
}
