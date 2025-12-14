import { fetchUser } from "@dicelette/bot-helpers";
import { findln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { DiscordChannel, PersonnageIds, UserMessageId } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	getIdFromMention,
	profiler,
} from "@dicelette/utils";
import { rename } from "commands";
import { getUserByEmbed, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import { getEmbeds } from "messages";
import { allowEdit } from "utils";
import { BaseFeature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationRename",
	level: BotErrorLevel.Warning,
};

/**
 * Rename feature class - handles character renaming operations
 * Uses instance properties to store context and reduce parameter passing
 */
export class RenameFeature extends BaseFeature {
	/**
	 * Handles the start of rename operation from a select menu interaction
	 */
	async start(): Promise<void> {
		const interaction = this.interaction as Djs.StringSelectMenuInteraction;
		if (!this.db) return; // db is required for Rename
		if (await allowEdit(interaction, this.db, this.interactionUser))
			await this.showRename(interaction);
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
	private async showRename(interaction: Djs.StringSelectMenuInteraction): Promise<void> {
		const name = this.getCurrentName(interaction);
		const modal = new Djs.ModalBuilder()
			.setCustomId("rename")
			.setTitle(this.ul("button.edit.name"))
			.addLabelComponents((label) =>
				label.setLabel(this.ul("common.charName")).setTextInputComponent((input) => {
					input
						.setCustomId("newName")
						.setStyle(Djs.TextInputStyle.Short)
						.setRequired(true);
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
	async validate(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!interaction.message) return;
		if (!this.client) return;
		profiler.startProfiler();
		const message = await (interaction.channel as TextChannel).messages.fetch(
			interaction.message.id
		);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const newName = interaction.fields.getTextInputValue("newName");
		if (!newName || !interaction.channel) return;
		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
		const userId = getIdFromMention(
			embed.toJSON().fields?.find((field) => findln(field.name) === "common.user")?.value
		);
		if (!userId) throw new BotError(this.ul("error.user.notFound.generic"), botErrorOptions);
		const user = await fetchUser(this.client, userId);
		const sheetLocation: PersonnageIds = {
			channelId: interaction.channel.id,
			messageId: message.id,
		};
		if (!user) throw new BotError(this.ul("error.user.notFound.generic"), botErrorOptions);
		const charData = getUserByEmbed({ message: message });
		if (!charData)
			throw new BotError(this.ul("error.user.youRegistered"), botErrorOptions);
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
		const guildData = this.client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		//update the characters database
		//remove the old chara
		await updateMemory(this.client.characters, interaction.guild!.id, userId, this.ul, {
			userData: charData,
		});
		await rename(
			newName,
			interaction,
			this.ul,
			user,
			this.client,
			sheetLocation,
			oldData,
			interaction.channel as DiscordChannel
		);
		profiler.stopProfiler();
	}
}
