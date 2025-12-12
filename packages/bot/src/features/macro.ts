import {
	addAutoRole,
	buildModerationButtons,
	CUSTOM_ID_PREFIX,
	deleteModerationCache,
	fetchChannel,
	fetchUser,
	getInteractionContext as getLangAndConfig,
	getMessageWithKeyPart,
	getModerationCache,
	getUserId,
	makeEmbedKey,
	parseEmbedKey,
	parseKeyFromCustomId,
	putModerationCache,
	reuploadAvatar,
	setModerationFooter,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { evalStatsDice, isNumber } from "@dicelette/core";
import { findln, ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type {
	Settings,
	Translation,
	UserMessageId,
	UserRegistration,
} from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	capitalizeBetweenPunct,
	DICE_PATTERNS,
	getIdFromMention,
	logger,
	NoEmbed,
	profiler,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import {
	getTemplateByInteraction,
	getUserByEmbed,
	getUserNameAndChar,
	registerUser,
	updateMemory,
} from "database";
import type { EmbedBuilder, TextChannel } from "discord.js";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	embedError,
	ensureEmbed,
	getEmbeds,
	removeEmbedsFromList,
	replaceEmbedInList,
	reply,
	sendLogs,
	stripFooter,
	updateUserEmbedThumbnail,
} from "messages";
import { allowEdit, editUserButtons, selectEditMenu, selfRegisterAllowance } from "utils";
import { BaseFeature } from "./base";

const botErrorOptions: BotErrorOptions = {
	cause: "DICE_REGISTER",
	level: BotErrorLevel.Warning,
};

const botErrorOptionsValidation: BotErrorOptions = {
	cause: "DICE_VALIDATION",
	level: BotErrorLevel.Warning,
};

/**
 * MacroFeature handles all macro/damage dice operations for characters.
 * This includes adding, editing, and validating macro dice.
 */
export class MacroFeature extends BaseFeature {
	/**
	 * Handles the interaction for adding a new skill dice via a button press.
	 * Checks if the user has permission to edit, then displays a modal for entering new skill dice details.
	 */
	async add() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;

		const allow = await allowEdit(interaction, this.db, this.interactionUser);
		if (allow)
			await this.show(
				interaction.customId.includes("first"),
				this.db.get(interaction.guild!.id, "lang") ?? interaction.locale
			);
	}

	/**
	 * Creates and displays a modal for adding damage dice to a character.
	 * @param first - Indicates if this is the initial dice addition during registration.
	 * @param lang - The locale used for modal labels and placeholders.
	 */
	private async show(first?: boolean, lang: Djs.Locale = Djs.Locale.EnglishGB) {
		const interaction = this.interaction as Djs.ButtonInteraction;
		const ul = ln(lang);
		const id = first ? "damageDice_first" : "damageDice";
		const modal = new Djs.ModalBuilder()
			.setCustomId(id)
			.setTitle(ul("common.macro").capitalize());

		const damageDice: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(ul("modals.dice.name"))
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId("damageName")
					.setRequired(true)
					.setStyle(Djs.TextInputStyle.Short)
			);
		const diceValue: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(ul("modals.dice.value"))
			.setDescription(ul("modals.dice.placeholder"))
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId("damageValue")
					.setPlaceholder("1d5")
					.setRequired(true)
					.setStyle(Djs.TextInputStyle.Short)
			);

		modal.addLabelComponents(damageDice, diceValue);
		await interaction.showModal(modal);
	}

	/**
	 * Initiates the dice editing process when the corresponding button is pressed,
	 * verifying the user's permission before displaying the edit modal.
	 */
	async edit() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;

		if (await allowEdit(interaction, this.db, this.interactionUser))
			await this.showEdit();
	}

	/**
	 * Displays a modal allowing the user to edit all registered skill dice.
	 * Parses the current dice from the message embed and pre-fills the modal input
	 * with a formatted list of skill-dice pairs.
	 */
	private async showEdit() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		const diceEmbed = getEmbeds(interaction.message, "damage");
		if (!diceEmbed)
			throw new BotError(this.ul("error.invalidDice.embeds"), {
				cause: "DICE_EDIT",
				level: BotErrorLevel.Warning,
			});
		const diceFields = parseEmbedFields(diceEmbed.toJSON() as Djs.Embed);
		let dices = "";
		for (const [skill, dice] of Object.entries(diceFields)) {
			if (dice === "common.space") dices += `- ${skill}: _ _\n`;
			else dices += `- ${skill}${this.ul("common.space")}: ${dice}\n`;
		}
		const modal = new Djs.ModalBuilder()
			.setCustomId("editDice")
			.setTitle(this.ul("common.macro").capitalize())
			.addLabelComponents((label) =>
				label
					.setLabel(this.ul("modals.edit.dice"))
					.setTextInputComponent((input) =>
						input
							.setCustomId("allDice")
							.setRequired(true)
							.setStyle(Djs.TextInputStyle.Paragraph)
							.setValue(dices)
					)
			);

		await interaction.showModal(modal);
	}

	/**
	 * Handles a modal submit interaction to register new skill damage dice for a user.
	 * Allows the operation only if the interacting user is the owner referenced in the embed
	 * or has moderator permissions.
	 */
	async store() {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		if (!(await getTemplateByInteraction(interaction, this.client))) {
			await reply(interaction, {
				embeds: [
					embedError(
						this.ul("error.template.notFound", { guildId: interaction.guildId }),
						this.ul
					),
				],
			});
			return;
		}
		const embed = ensureEmbed(interaction.message ?? undefined);
		const userMention = embed.fields.find(
			(field) => findln(field.name) === "common.user"
		)?.value;
		const sameUser = getIdFromMention(userMention) === this.interactionUser.id;
		const isModerator = interaction.guild?.members.cache
			.get(this.interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (sameUser || isModerator)
			await this.registerDamageDice(interaction.customId.includes("first"));
		else
			await reply(interaction, {
				content: this.ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		profiler.stopProfiler();
	}

	/**
	 * Static method to generate buttons for user registration process
	 * (adding the "add dice" button).
	 */
	static buttons(ul: Translation, markAsValidated = false, moderationSent = false) {
		const validateButton = new Djs.ButtonBuilder()
			.setCustomId("validate")
			.setLabel(ul("button.validate"))
			.setStyle(Djs.ButtonStyle.Success);
		if (markAsValidated) {
			validateButton
				.setLabel(ul("button.confirm"))
				.setCustomId("mark_as_valid")
				.setStyle(Djs.ButtonStyle.Primary)
				.setEmoji("📤");
		}
		const cancelButton = new Djs.ButtonBuilder()
			.setCustomId(moderationSent ? "moderation_refuse" : "cancel")
			.setLabel(moderationSent ? ul("button.refuse") : ul("common.cancel"))
			.setStyle(Djs.ButtonStyle.Danger);
		let cancelBut: Djs.ButtonBuilder | null = null;
		if (moderationSent) {
			cancelBut = new Djs.ButtonBuilder()
				.setCustomId("cancel_by_user")
				.setLabel(ul("common.cancel"))
				.setStyle(Djs.ButtonStyle.Danger);
		}
		const registerDmgButton = new Djs.ButtonBuilder()
			.setCustomId("add_dice_first")
			.setLabel(ul("button.dice"))
			.setStyle(Djs.ButtonStyle.Primary);
		const actionRow = [registerDmgButton, validateButton, cancelButton];
		if (cancelBut) actionRow.push(cancelBut);
		return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(actionRow);
	}

	/**
	 * Registers a new skill damage dice from modal input, updating the corresponding
	 * embed and database entry. Handles both initial dice registration for a user and
	 * subsequent additions or edits.
	 */
	private async registerDamageDice(first?: boolean) {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		const db = this.client.settings;
		const { ul } = getLangAndConfig(this.client, interaction);
		const name = interaction.fields.getTextInputValue("damageName");
		let value = interaction.fields.getTextInputValue("damageValue");
		if (!interaction.guild) throw new BotError(ul("error.guild.empty"), botErrorOptions);
		if (!interaction.message) throw new BotError(ul("error.noMessage"), botErrorOptions);

		if (name.includes(":")) throw new BotError(ul("error.colon"), botErrorOptions);
		const oldDiceEmbeds = getEmbeds(interaction.message ?? undefined, "damage")?.toJSON();
		const diceEmbed = oldDiceEmbeds
			? new Djs.EmbedBuilder(oldDiceEmbeds)
			: createDiceEmbed(ul);
		if (oldDiceEmbeds?.fields)
			for (const field of oldDiceEmbeds.fields) {
				const newField = {
					inline: field.inline,
					name: capitalizeBetweenPunct(field.name),
					value: field.value,
				};
				if (
					diceEmbed
						.toJSON()
						.fields?.findIndex(
							(f) => f.name.standardize() === field.name.standardize()
						) === -1
				) {
					diceEmbed.addFields(newField);
				}
			}
		const user = getUserByEmbed({ message: interaction.message }, first);
		if (!user) throw new BotError(ul("error.user.notFound"), botErrorOptions);
		value = value.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1").trim();
		value = evalStatsDice(value, user.stats);

		if (!MacroFeature.findDuplicate(diceEmbed, name) || !diceEmbed.toJSON().fields) {
			diceEmbed.addFields({
				inline: true,
				name: capitalizeBetweenPunct(name),
				value: `\`${value}\``,
			});
		} else {
			const allFieldWithoutDuplicate = diceEmbed
				.toJSON()
				?.fields?.filter((field) => field.name.standardize() !== name.standardize());
			if (allFieldWithoutDuplicate) {
				diceEmbed.setFields([
					...allFieldWithoutDuplicate,
					{
						inline: true,
						name: capitalizeBetweenPunct(name),
						value: `\`${value}\``,
					},
				]);
			}
		}

		const damageName = diceEmbed.toJSON().fields?.reduce(
			(acc, field) => {
				acc[field.name] = field.value.removeBacktick();
				return acc;
			},
			{} as Record<string, string>
		);
		if (damageName && Object.keys(damageName).length > 25) {
			await reply(interaction, {
				content: ul("modals.dice.max"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const { userID, userName } = await getUserNameAndChar(interaction, ul, first);
		await addAutoRole(
			interaction,
			userID,
			!!damageName && Object.keys(damageName).length > 0,
			false,
			db
		);
		let allEmbeds: Djs.EmbedBuilder[] = [];
		let components: (
			| Djs.ActionRowBuilder<Djs.ButtonBuilder>
			| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
		)[] = [];
		const userEmbed = getEmbeds(interaction.message ?? undefined, "user");
		const statsEmbed = getEmbeds(interaction.message ?? undefined, "stats");
		if (!userEmbed) throw new NoEmbed();
		allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		const compare = first
			? undefined
			: displayOldAndNewStats(oldDiceEmbeds?.fields, diceEmbed.toJSON().fields);
		if (!first) {
			const templateEmbed = getEmbeds(interaction.message ?? undefined, "template");
			if (templateEmbed) allEmbeds.push(templateEmbed);
			components = [editUserButtons(ul, !!statsEmbed, true), selectEditMenu(ul)];
			const isModerator = interaction.guild?.members.cache
				.get(interaction.user.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
			const allowance = selfRegisterAllowance(
				db.get(interaction.guild!.id, "allowSelfRegister")
			);
			if (allowance.moderation && allowance.allowSelfRegister && !isModerator) {
				const embedKey = makeEmbedKey(
					interaction.guild!.id,
					interaction.message.channelId,
					interaction.message.id
				);
				setModerationFooter(diceEmbed, {
					channelId: interaction.message.channelId,
					messageId: interaction.message.id,
					userID,
					userName,
				});
				putModerationCache(embedKey, {
					embeds: allEmbeds,
					kind: "dice-add",
					meta: {
						channelId: interaction.message.channelId,
						messageId: interaction.message.id,
						userID,
						userName,
					},
				});

				const row = buildModerationButtons("dice-add", ul, embedKey);
				await reply(interaction, { components: [row], embeds: [diceEmbed] });
				return;
			}
			const userRegister: {
				userID: string;
				charName: string | undefined;
				damage: string[] | undefined;
				msgId: UserMessageId;
			} = {
				charName: userName,
				damage: damageName ? Object.keys(damageName) : undefined,
				msgId: [interaction.message.id, interaction.message.channel.id],
				userID,
			};
			await registerUser(userRegister, interaction, db, false);
			await updateMemory(this.client.characters, interaction.guild.id, userID, ul, {
				embeds: allEmbeds,
			});
		} else {
			const isModerator = interaction.guild?.members.cache
				.get(interaction.user.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
			const selfRegister = selfRegisterAllowance(
				db.get(interaction.guild!.id, "allowSelfRegister")
			).moderation;
			components = [MacroFeature.buttons(ul, selfRegister && !isModerator)];
		}

		await this.editMessage(
			db,
			ul,
			allEmbeds,
			components,
			userID,
			userName,
			compare,
			first
		);
		profiler.stopProfiler();
	}

	private async editMessage(
		db: Settings,
		ul: Translation,
		allEmbeds: Djs.EmbedBuilder[],
		components: (
			| Djs.ActionRowBuilder<Djs.ButtonBuilder>
			| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
		)[],
		userID: string,
		userName?: string,
		compare?: { stats: string; removed: number; added: number; changed: number },
		first?: boolean
	) {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (interaction.message) {
			const { files, userDataEmbed } = await updateUserEmbedThumbnail(
				interaction.message,
				allEmbeds[0],
				ul
			);
			allEmbeds[0] = userDataEmbed;
			await interaction?.message?.edit({ components, embeds: allEmbeds, files });
		}
		await reply(interaction, {
			content: ul("modals.added.dice"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		if (first) return;
		if (!compare)
			return await sendLogs(
				ul("logs.dice.add", {
					char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
					count: 1,
					fiche: interaction.message?.url ?? "no url",
					user: Djs.userMention(interaction.user.id),
				}),
				interaction.guild as Djs.Guild,
				db
			);
		const msg = ul("logs.dice.add", {
			char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			count: compare.added,
			fiche: interaction.message?.url ?? "no url",
			user: Djs.userMention(interaction.user.id),
		});
		return await sendLogs(`${msg}\n${compare.stats}`, interaction.guild as Djs.Guild, db);
	}

	static findDuplicate(diceEmbed: EmbedBuilder, name: string) {
		if (!diceEmbed.toJSON().fields) return false;
		return (
			diceEmbed
				.toJSON()
				.fields?.findIndex((f) => f.name.standardize() === name.standardize()) !== -1
		);
	}

	/**
	 * Validates and applies dice edits from a Discord modal interaction.
	 */
	async validate() {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		const db = this.client.settings;
		if (!interaction.message) return;
		const message = await (interaction.channel as TextChannel).messages.fetch(
			interaction.message.id
		);
		const allowance = selfRegisterAllowance(
			this.client.settings.get(interaction.guild!.id, "allowSelfRegister")
		);
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);

		const flags =
			allowance.moderation && allowance.allowSelfRegister && !isModerator
				? undefined
				: Djs.MessageFlags.Ephemeral;
		await interaction.deferReply({ flags });
		const diceEmbeds = getEmbeds(message ?? undefined, "damage");
		if (!diceEmbeds) return;

		const values = interaction.fields.getTextInputValue("allDice");
		const { fieldsToAppend, diceEmbed, oldFields, removed } =
			this.createAndValidateDiceEmbed(values, message);

		const { userID, userName } = await getUserNameAndChar(interaction, this.ul);
		const messageID = [message.id, message.channelId] as UserMessageId;

		if (allowance.moderation && allowance.allowSelfRegister && !isModerator) {
			const embedKey = makeEmbedKey(interaction.guild!.id, message.channelId, message.id);
			setModerationFooter(diceEmbed, {
				channelId: message.channelId,
				messageId: message.id,
				userID,
				userName,
			});
			putModerationCache(embedKey, {
				embed: diceEmbed,
				kind: "dice-edit",
				meta: { channelId: message.channelId, messageId: message.id, userID, userName },
			});

			const row = buildModerationButtons("dice-edit", this.ul, embedKey);
			if (!fieldsToAppend || fieldsToAppend.length === 0) {
				await interaction.editReply({
					components: [row],
					content: this.ul("modals.removed.dice"),
				});
			} else await interaction.editReply({ components: [row], embeds: [diceEmbed] });
			const url = await interaction.fetchReply();
			const userFeature = new (await import("./user")).UserFeature({
				client: this.client,
				interaction,
				interactionUser: interaction.user,
				ul: this.ul,
			});
			await userFeature.sendValidationMessage(url.url);
			return;
		}

		const edited = await this.editMessageDiceEmbeds(message, diceEmbed, removed);

		const damageNames = removed
			? undefined
			: Object.keys(
					fieldsToAppend.reduce(
						(acc, field) => {
							acc[field.name] = field.value;
							return acc;
						},
						{} as Record<string, string>
					)
				);
		await this.persistUserAndMemory(
			userID,
			userName,
			messageID,
			edited.embeds,
			damageNames
		);

		await this.sendValidationResponses({
			db,
			message,
			newFields: fieldsToAppend,
			oldFields,
			removed,
			userID,
			userName,
		});
		profiler.stopProfiler();
	}

	private parseStatsString(statsEmbed: Djs.EmbedBuilder) {
		const stats = parseEmbedFields(statsEmbed.toJSON() as Djs.Embed);
		const parsedStats: Record<string, number> = {};
		for (const [name, value] of Object.entries(stats)) {
			let number = Number.parseInt(value, 10);
			if (!isNumber(value)) {
				const combinaison = value.replace(/`(.*)` =/, "").trim();
				number = Number.parseInt(combinaison, 10);
			}
			parsedStats[name] = number;
		}
		return parsedStats;
	}

	private compareUnidecode(a: string, b: string) {
		return a.unidecode().standardize() === b.unidecode().standardize();
	}

	private createAndValidateDiceEmbed(values: string, message: Djs.Message) {
		const diceEmbeds = getEmbeds(message ?? undefined, "damage");
		if (!diceEmbeds)
			return {
				diceEmbed: createDiceEmbed(this.ul),
				fieldsToAppend: [],
				oldFields: [],
				removed: true,
			};

		const valuesAsDice = values.split("\n- ").map((dice) => {
			const match = dice.match(/^([^:]+):(.*)$/s);
			if (match) {
				return {
					name: match[1].trim().replace(/^- /, "").toLowerCase(),
					value: match[2].trim(),
				};
			}
			const [name, value] = dice.split(/ ?: ?/);
			return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
		});

		const dices = valuesAsDice.reduce(
			(acc, { name, value }) => {
				acc[name] = value;
				return acc;
			},
			{} as Record<string, string>
		);
		const statsEmbeds = getEmbeds(message ?? undefined, "stats");
		let statsValues: Record<string, number> | undefined;
		if (statsEmbeds) statsValues = this.parseStatsString(statsEmbeds);

		const newEmbedDice: Djs.APIEmbedField[] = [];
		for (const [skill, dice] of Object.entries(dices)) {
			if (newEmbedDice.find((field) => this.compareUnidecode(field.name, skill)))
				continue;
			if (dice.toLowerCase() === "x" || dice.trim().length === 0 || dice === "0") {
				newEmbedDice.push({ inline: true, name: skill.capitalize(), value: "X" });
				continue;
			}
			const toRoll = dice.replace(DICE_PATTERNS.DETECT_DICE_MESSAGE, "$1").trim();
			try {
				evalStatsDice(toRoll, statsValues);
			} catch (error) {
				logger.warn(error);
				throw new BotError(
					this.ul("error.invalidDice.eval", { dice }),
					botErrorOptionsValidation
				);
			}
			newEmbedDice.push({
				inline: true,
				name: skill.capitalize(),
				value: `\`${toRoll}\``,
			});
		}

		const oldDice = diceEmbeds.toJSON().fields;
		if (oldDice) {
			for (const field of oldDice) {
				const name = field.name.toLowerCase();
				const newValue = newEmbedDice.find((f) => this.compareUnidecode(f.name, name));
				if (!newValue)
					newEmbedDice.push({
						inline: true,
						name: name.capitalize(),
						value: field.value,
					});
			}
		}

		const fieldsToAppend: Djs.APIEmbedField[] = [];
		for (const field of newEmbedDice) {
			const name = field.name.toLowerCase();
			const dice = field.value;
			if (
				fieldsToAppend.find((f) => this.compareUnidecode(f.name, name)) ||
				dice.toLowerCase() === "x" ||
				dice.trim().length === 0 ||
				dice === "0"
			)
				continue;
			fieldsToAppend.push({
				inline: true,
				name: capitalizeBetweenPunct(name.capitalize()),
				value: dice,
			});
		}

		const diceEmbed = createDiceEmbed(this.ul).addFields(fieldsToAppend);
		const removed = !fieldsToAppend || fieldsToAppend.length === 0;
		return { diceEmbed, fieldsToAppend, oldFields: oldDice ?? [], removed };
	}

	private async editMessageDiceEmbeds(
		message: Djs.Message,
		diceEmbed: Djs.EmbedBuilder,
		removed: boolean
	): Promise<{ embeds: Djs.EmbedBuilder[] }> {
		const embedsList = await replaceEmbedInList(
			this.ul,
			{ embed: diceEmbed, which: "damage" },
			message
		);
		if (removed) {
			const toAdd = removeEmbedsFromList(embedsList.list, "damage");
			const components = editUserButtons(this.ul, embedsList.exists.stats, false);
			await message.edit({
				components: [components, selectEditMenu(this.ul)],
				embeds: toAdd,
				files: embedsList.files,
			});
			return { embeds: toAdd };
		}
		await message.edit({ embeds: embedsList.list, files: embedsList.files });
		return { embeds: embedsList.list };
	}

	private async persistUserAndMemory(
		userID: string,
		userName: string | undefined,
		messageID: UserMessageId,
		embeds: Djs.EmbedBuilder[],
		damage: string[] | undefined
	) {
		if (!this.client) return;
		const interaction = this.interaction;

		await updateMemory(this.client.characters, interaction.guild!.id, userID, this.ul, {
			embeds,
		});
		const userRegister: UserRegistration = {
			charName: userName,
			damage,
			msgId: messageID,
			userID,
		};
		await registerUser(userRegister, interaction, this.client.settings, false);
	}

	private async sendValidationResponses(args: {
		interaction?: Djs.ModalSubmitInteraction | Djs.ButtonInteraction;
		removed: boolean;
		oldFields: Djs.APIEmbedField[] | undefined;
		newFields: Djs.APIEmbedField[];
		userID: string;
		userName?: string;
		message: Djs.Message;
		db: EClient["settings"];
	}) {
		const interaction =
			args.interaction ?? (this.interaction as Djs.ModalSubmitInteraction);
		const { removed, oldFields, newFields, userID, userName, message, db } = args;
		if (removed) {
			await reply(interaction, {
				content: this.ul("modals.removed.dice"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			const count = oldFields?.length ?? 0;
			await sendLogs(
				this.ul("logs.dice.remove", {
					char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
					count,
					fiche: message.url,
					user: Djs.userMention(interaction.user.id),
				}),
				interaction.guild as Djs.Guild,
				db
			);
			return;
		}
		const compare = displayOldAndNewStats(oldFields ?? [], newFields);
		const count = compare.added + compare.changed + compare.removed;
		await reply(interaction, {
			content: this.ul("embed.edit.dice", {
				count,
			}),
			flags: Djs.MessageFlags.Ephemeral,
		});
		const logMessage = this.ul("logs.dice.edit", {
			char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			count,
			fiche: message.url,
			user: Djs.userMention(interaction.user.id),
		});
		await sendLogs(
			`${logMessage}\n${compare.stats}`.trim(),
			interaction.guild as Djs.Guild,
			db
		);
	}

	/**
	 * Helper method to check if user has moderator permissions
	 */
	private async checkModeratorPermission(): Promise<boolean> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		const moderator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (!moderator) {
			await reply(interaction, {
				content: this.ul("modals.onlyModerator"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return false;
		}
		return true;
	}

	/**
	 * Helper method to handle cancellation logic
	 */
	private async handleCancellation(embedKey: string | undefined): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		const { userId, url } = getUserId(interaction);
		if (embedKey) deleteModerationCache(embedKey);

		const samePerson = interaction.user.id === userId;
		let content = this.ul("modals.cancelled", { url });
		if (samePerson) content = this.ul("modals.cancelled_by_user", { url });
		await interaction.message.delete();
		await reply(interaction, {
			content,
			flags: Djs.MessageFlags.Ephemeral,
		});
		if (userId && !samePerson) {
			const user = await fetchUser(this.client!, userId);
			if (user) await user.send(content);
		}
	}

	/**
	 * Validation by a moderator for dice editing (via button).
	 */
	async couldBeValidatedDice() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		if (!(await this.checkModeratorPermission())) return;

		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceEdit.validate, customId);
		if (!embedKey)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);

		const cached = getModerationCache(embedKey);
		let workingEmbed: Djs.EmbedBuilder | undefined =
			cached && cached.kind === "dice-edit" ? cached.embed : undefined;

		if (!workingEmbed) {
			const apiEmbed = interaction.message.embeds[0];
			if (!apiEmbed) {
				workingEmbed = createDiceEmbed(this.ul);
			} else {
				workingEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
			}
		}
		if (!workingEmbed)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);

		const message = await getMessageWithKeyPart(this.ul, interaction, embedKey);
		const newFields = workingEmbed.toJSON().fields ?? [];
		const removed = newFields.length === 0;

		const oldDamage = getEmbeds(message ?? undefined, "damage");
		const oldFields = oldDamage?.toJSON().fields ?? [];
		workingEmbed = workingEmbed.setFooter(null);
		const edited = await this.editMessageDiceEmbeds(
			message,
			stripFooter(workingEmbed),
			removed
		);

		const damageNames = removed
			? undefined
			: Object.keys(
					(newFields as Djs.APIEmbedField[]).reduce(
						(acc, field) => {
							acc[field.name] = field.value;
							return acc;
						},
						{} as Record<string, string>
					)
				);
		const userEmbed = getEmbeds(message ?? undefined, "user");
		if (!userEmbed)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);
		const parsedUser = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
		const mention = parsedUser["common.user"];
		const ownerId = getIdFromMention(mention);
		const charNameRaw = parsedUser["common.character"];
		const ownerName =
			charNameRaw && charNameRaw.toLowerCase() !== this.ul("common.noSet").toLowerCase()
				? charNameRaw
				: undefined;

		await this.persistUserAndMemory(
			ownerId!,
			ownerName,
			[message.id, message.channelId],
			edited.embeds,
			damageNames
		);

		await this.sendValidationResponses({
			db: this.client.settings,
			interaction,
			message,
			newFields: newFields as Djs.APIEmbedField[],
			oldFields,
			removed,
			userID: ownerId!,
			userName: ownerName,
		});

		deleteModerationCache(embedKey);
		await interaction.message.delete();
	}

	/**
	 * Canceling a validation request through moderation (button).
	 */
	async cancelDiceModeration() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceEdit.cancel, customId);
		await this.handleCancellation(embedKey);
	}

	/**
	 * Validation by a moderator for adding dice (via button).
	 */
	async couldBeValidatedDiceAdd() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		if (!(await this.checkModeratorPermission())) return;

		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceAdd.validate, customId);
		if (!embedKey)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);
		const cachedRaw = getModerationCache(embedKey);
		const cached = cachedRaw && cachedRaw.kind === "dice-add" ? cachedRaw : undefined;

		let targetChannelId: string | undefined;
		let targetMessageId: string | undefined;
		let userID: string | undefined;
		let userName: string | undefined;
		let moderationDiceEmbed: Djs.EmbedBuilder | undefined;

		if (cached) {
			targetChannelId = cached.meta.channelId;
			targetMessageId = cached.meta.messageId;
			userID = cached.meta.userID;
			userName = cached.meta.userName;
		} else {
			const apiEmbed = interaction.message.embeds[0];
			if (!apiEmbed)
				throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);
			moderationDiceEmbed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
			const keyParts = parseEmbedKey(embedKey);
			if (!keyParts)
				throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);
			targetChannelId = keyParts.channelId;
			targetMessageId = keyParts.messageId;
		}

		const channel = await fetchChannel(interaction.guild!, targetChannelId!);
		if (!channel || !channel.isTextBased())
			throw new BotError(this.ul("error.channel.notFound"), botErrorOptionsValidation);
		const message = await channel.messages.fetch(targetMessageId!);
		const userEmbed = getEmbeds(message ?? undefined, "user");
		if (!userEmbed)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptionsValidation);

		const oldDamage = getEmbeds(message ?? undefined, "damage");
		const oldFields = oldDamage?.toJSON().fields ?? [];

		let embedsApplied: Djs.EmbedBuilder[];
		let hasStats: boolean;
		let files: Djs.AttachmentBuilder[] | undefined;
		if (cached) {
			embedsApplied = cached.embeds;
			hasStats = !!getEmbeds(undefined, "stats", cached.embeds);
			const damage = getEmbeds(undefined, "damage", embedsApplied);
			if (damage?.toJSON().footer) {
				const damageTitle = damage.toJSON().title ?? "";
				const sanitized = stripFooter(damage);
				embedsApplied = embedsApplied.map((e) =>
					(e.toJSON().title ?? "") === damageTitle ? sanitized : e
				);
				const userEmbed = getEmbeds(undefined, "user", embedsApplied);
				const thumbnail = userEmbed?.data.thumbnail?.url;
				if (thumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
					const res = await reuploadAvatar(
						{
							name: thumbnail.split("?")[0].split("/").pop() ?? "avatar.png",
							url: thumbnail,
						},
						this.ul
					);
					const sanitizedUserEmbed = userEmbed!.setThumbnail(res.name);
					embedsApplied = embedsApplied.map((e) =>
						(e.toJSON().title ?? "") === (userEmbed!.toJSON().title ?? "")
							? sanitizedUserEmbed
							: e
					);
					files = [res.newAttachment];
				}
			}
		} else {
			const diceEmbedToApply = stripFooter(moderationDiceEmbed!);
			const edited = await replaceEmbedInList(
				this.ul,
				{ embed: diceEmbedToApply, which: "damage" },
				message
			);
			embedsApplied = edited.list;
			hasStats = edited.exists.stats;
			files = edited.files;
		}
		const components = [
			editUserButtons(this.ul, hasStats, true),
			selectEditMenu(this.ul),
		];

		await message.edit({ components, embeds: embedsApplied, files });

		const newDamage = getEmbeds(message ?? undefined, "damage");
		const newFields = newDamage?.toJSON().fields ?? [];
		const damageNames = newFields.length
			? Object.keys(
					(newFields as Djs.APIEmbedField[]).reduce(
						(acc, f) => {
							acc[f.name] = f.value;
							return acc;
						},
						{} as Record<string, string>
					)
				)
			: undefined;

		if (!userID) {
			const parsedUser2 = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
			const mention2 = parsedUser2["common.user"];
			userID = getIdFromMention(mention2);
			const charNameRaw2 = parsedUser2["common.character"];
			userName =
				charNameRaw2 &&
				charNameRaw2.toLowerCase() !== this.ul("common.noSet").toLowerCase()
					? charNameRaw2
					: undefined;
		}

		await this.persistUserAndMemory(
			userID!,
			userName,
			[message.id, message.channelId],
			embedsApplied,
			damageNames
		);

		await this.sendValidationResponses({
			db: this.client.settings,
			interaction,
			message,
			newFields: newFields as Djs.APIEmbedField[],
			oldFields,
			removed: !(newFields.length > 0),
			userID: userID!,
			userName,
		});

		deleteModerationCache(embedKey);
		await interaction.message.delete();
	}

	async cancelDiceAddModeration() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.diceAdd.cancel, customId);
		await this.handleCancellation(embedKey);
	}
}
