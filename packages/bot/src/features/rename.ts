import { fetchUser } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { findln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type {
	DiscordChannel,
	PersonnageIds,
	Settings,
	Translation,
	UserMessageId,
} from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	profiler,
} from "@dicelette/utils";
import { rename } from "commands";
import { getUserByEmbed, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit } from "utils";
import { Feature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationRename",
	level: BotErrorLevel.Warning,
};

/**
 * Rename feature class - handles character renaming operations
 */
export class RenameFeature extends Feature {
	/**
	 * Handles the start of rename operation from a select menu interaction
	 */
	async start(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db: Settings
	): Promise<void> {
		if (await allowEdit(interaction, db, interactionUser))
			await this.showRename(interaction, ul);
	}

	/**
	 * Extracts the current character name from the message embed associated with the interaction.
	 * @param interaction - The Discord StringSelectMenuInteraction containing the message and embeds.
	 * @returns The character name as a string, or null if not found or not set.
	 */
	private getCurrentName(interaction: Djs.StringSelectMenuInteraction): string | null {
		if (!interaction.message) return null;
		const embeds = getEmbeds(interaction.message, "user", interaction.message.embeds);
		if (!embeds) return null;
		const parsedFields = parseEmbedFields(embeds.toJSON() as Djs.Embed);
		const charNameFields = [
			{ key: "common.charName", value: parsedFields?.["common.charName"] },
			{ key: "common.character", value: parsedFields?.["common.character"] },
		].find((field) => field.value !== undefined);
		if (charNameFields && charNameFields.value !== "common.noSet") {
			return charNameFields.value;
		}
		return null;
	}

	/**
	 * Displays a modal for renaming a character
	 */
	private async showRename(
		interaction: Djs.StringSelectMenuInteraction,
		ul: Translation
	): Promise<void> {
		const name = this.getCurrentName(interaction);
		const modal = new Djs.ModalBuilder()
			.setCustomId("rename")
			.setTitle(ul("button.edit.name"))
			.addLabelComponents((label) =>
				label.setLabel(ul("common.charName")).setTextInputComponent((input) => {
					input.setCustomId("newName").setStyle(Djs.TextInputStyle.Short).setRequired(true);
					if (name) input.setValue(name);
					return input;
				})
			);

		await interaction.showModal(modal);
	}

	/**
	 * Handles validation and execution of a character rename operation from a Discord modal submission.
	 *
	 * Retrieves and validates the relevant message, user, and character data, then updates the character's name and database records accordingly.
	 *
	 * @throws {Error} If the required embed, user ID, user object, or character data cannot be found.
	 */
	async validate(
		interaction: Djs.ModalSubmitInteraction,
		ul: Translation,
		client: EClient
	): Promise<void> {
		if (!interaction.message) return;
		profiler.startProfiler();
		const message = await (interaction.channel as TextChannel).messages.fetch(
			interaction.message.id
		);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const newName = interaction.fields.getTextInputValue("newName");
		if (!newName || !interaction.channel) return;
		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(ul("error.embed.notFound"), botErrorOptions);
		const userId = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.user")
			?.value.replace(/<@|>/g, "");
		if (!userId) throw new BotError(ul("error.user.notFound"), botErrorOptions);
		const user = await fetchUser(client, userId);
		const sheetLocation: PersonnageIds = {
			channelId: interaction.channel.id,
			messageId: message.id,
		};
		if (!user) throw new BotError(ul("error.user.notFound"), botErrorOptions);
		const charData = getUserByEmbed({ message: message });
		if (!charData) throw new BotError(ul("error.user.youRegistered"), botErrorOptions);
		const oldData: {
			charName?: string | null;
			messageId: UserMessageId;
			damageName?: string[];
			isPrivate?: boolean;
		} = {
			charName: charData.userName,
			damageName: Object.keys(charData.damage ?? {}),
			isPrivate: charData.private,
			messageId: [sheetLocation.messageId, sheetLocation.channelId],
		};
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		//update the characters database
		//remove the old chara
		await updateMemory(client.characters, interaction.guild!.id, userId, ul, {
			userData: charData,
		});
		await rename(
			newName,
			interaction,
			ul,
			user,
			client,
			sheetLocation,
			oldData,
			interaction.channel as DiscordChannel
		);
		profiler.stopProfiler();
	}
}

// Export singleton instance
export const Rename = new RenameFeature();
