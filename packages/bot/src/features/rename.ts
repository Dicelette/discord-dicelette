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
import type { Feature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "validationRename",
	level: BotErrorLevel.Warning,
};

/**
 * Rename feature class - handles character renaming operations
 */
export class RenameFeature implements Feature {
	private interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction;
	private ul: Translation;
	private interactionUser: Djs.User;
	private db?: Settings;
	private client?: EClient;

	constructor(
		interaction: Djs.StringSelectMenuInteraction | Djs.ModalSubmitInteraction,
		ul: Translation,
		interactionUser: Djs.User,
		db?: Settings,
		client?: EClient
	) {
		this.interaction = interaction;
		this.ul = ul;
		this.interactionUser = interactionUser;
		this.db = db;
		this.client = client;
	}

	/**
	 * Handles the start of rename operation from a select menu interaction
	 */
	async start(): Promise<void> {
		if (
			this.db &&
			this.interaction instanceof Djs.StringSelectMenuInteraction &&
			(await allowEdit(this.interaction, this.db, this.interactionUser))
		)
			await this.showRename();
	}

	/**
	 * Extracts the current character name from the message embed associated with the interaction.
	 * @returns The character name as a string, or null if not found or not set.
	 */
	private getCurrentName(): string | null {
		if (!(this.interaction instanceof Djs.StringSelectMenuInteraction)) return null;
		if (!this.interaction.message) return null;
		const embeds = getEmbeds(this.interaction.message, "user", this.interaction.message.embeds);
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
	private async showRename(): Promise<void> {
		if (!(this.interaction instanceof Djs.StringSelectMenuInteraction)) return;
		const name = this.getCurrentName();
		const modal = new Djs.ModalBuilder()
			.setCustomId("rename")
			.setTitle(this.ul("button.edit.name"))
			.addLabelComponents((label) =>
				label.setLabel(this.ul("common.charName")).setTextInputComponent((input) => {
					input.setCustomId("newName").setStyle(Djs.TextInputStyle.Short).setRequired(true);
					if (name) input.setValue(name);
					return input;
				})
			);

		await this.interaction.showModal(modal);
	}

	/**
	 * Handles validation and execution of a character rename operation from a Discord modal submission.
	 *
	 * Retrieves and validates the relevant message, user, and character data, then updates the character's name and database records accordingly.
	 *
	 * @throws {Error} If the required embed, user ID, user object, or character data cannot be found.
	 */
	async validate(): Promise<void> {
		if (!this.client) return;
		if (!(this.interaction instanceof Djs.ModalSubmitInteraction)) return;
		if (!this.interaction.message) return;
		profiler.startProfiler();
		const message = await (this.interaction.channel as TextChannel).messages.fetch(
			this.interaction.message.id
		);
		await this.interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const newName = this.interaction.fields.getTextInputValue("newName");
		if (!newName || !this.interaction.channel) return;
		const embed = getEmbeds(message, "user");
		if (!embed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
		const userId = embed
			.toJSON()
			.fields?.find((field) => findln(field.name) === "common.user")
			?.value.replace(/<@|>/g, "");
		if (!userId) throw new BotError(this.ul("error.user.notFound"), botErrorOptions);
		const user = await fetchUser(this.client, userId);
		const sheetLocation: PersonnageIds = {
			channelId: this.interaction.channel.id,
			messageId: message.id,
		};
		if (!user) throw new BotError(this.ul("error.user.notFound"), botErrorOptions);
		const charData = getUserByEmbed({ message: message });
		if (!charData) throw new BotError(this.ul("error.user.youRegistered"), botErrorOptions);
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
		const guildData = this.client.settings.get(this.interaction.guildId as string);
		if (!guildData) return;
		//update the characters database
		//remove the old chara
		await updateMemory(this.client.characters, this.interaction.guild!.id, userId, this.ul, {
			userData: charData,
		});
		await rename(
			newName,
			this.interaction,
			this.ul,
			user,
			this.client,
			sheetLocation,
			oldData,
			this.interaction.channel as DiscordChannel
		);
		profiler.stopProfiler();
	}
}
