import {
	addAutoRole,
	fetchAvatarUrl,
	fetchChannel,
	getInteractionContext as getLangAndConfig,
	pingModeratorRole,
	reuploadAvatar,
} from "@dicelette/bot-helpers";
import { isNumber, type StatisticalTemplate } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { UserData } from "@dicelette/types";
import {
	allValueUndefOrEmptyString,
	cleanAvatarUrl,
	getIdFromMention,
	logger,
	MENTION_ID_DETECTION,
	NoChannel,
	NoEmbed,
	profiler,
	QUERY_URL_PATTERNS,
	verifyAvatarUrl,
} from "@dicelette/utils";
import { getTemplateByInteraction } from "database";
import type { GuildBasedChannel } from "discord.js";
import * as Djs from "discord.js";
import { MacroFeature, StatsFeature } from "features";
import * as Messages from "messages";
import { continueCancelButtons, selfRegisterAllowance } from "utils";
import { BaseFeature } from "./base";

/**
 * User feature class - handles user registration and management
 * Uses instance properties to store context and reduce parameter passing
 */
export class UserFeature extends BaseFeature {
	/**
	 * Handles the start of user registration from a button interaction
	 */
	async start(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;

		const moderatorPermission = interaction.guild?.members.cache
			.get(this.interactionUser.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		const isModerator = this.selfRegister || moderatorPermission;

		if (isModerator) await this.show(moderatorPermission);
		else
			await Messages.reply(interaction, {
				content: this.ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
	}

	/**
	 * Modal opened to register a new user with the name of the character and the user id
	 */
	private async show(isModerator?: boolean): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;

		let nbOfPages = 1;
		if (this.template.statistics) {
			const nbOfStatistique = Object.keys(this.template.statistics).length;
			nbOfPages =
				Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) + 1 : 2;
		}

		const modal = new Djs.ModalBuilder()
			.setCustomId("firstPage")
			.setTitle(this.ul("modals.firstPage", { page: nbOfPages }));

		//create a new Label builder component with a text input for the character name
		const charNameInput: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(this.ul("common.charName"))
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId("charName")
					.setPlaceholder(this.ul("modals.charName.description"))
					.setRequired(this.template.charName || false)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);

		//we will use the new LabelBuilder component to create a label with a user select for the user!
		const userIdInputs: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(this.ul("common.user"))
			.setUserSelectMenuComponent(
				new Djs.UserSelectMenuBuilder()
					.setCustomId("userID")
					.setPlaceholder(this.ul("modals.user.description"))
					.setRequired(true)
					.setDefaultUsers([interaction.user.id])
					.setMaxValues(1)
			);

		//we will use the new LabelBuilder component to create a label with a text input for the avatar!
		const avatarInputs: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(this.ul("modals.avatar.name"))
			.setDescription(this.ul("modals.avatar.file.description"))
			.setFileUploadComponent(
				new Djs.FileUploadBuilder()
					.setCustomId("avatarFile")
					.setRequired(false)
					.setMaxValues(1)
			);

		//we will use the new LabelBuilder component to create a label with a channel select for the channel!
		const channelIdInput: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(this.ul("modals.channel.name"))
			.setDescription(this.ul("modals.channel.description"))
			.setChannelSelectMenuComponent(
				new Djs.ChannelSelectMenuBuilder()
					.setCustomId("channelId")
					.setRequired(false)
					.setMaxValues(1)
					.setChannelTypes(
						Djs.ChannelType.PublicThread,
						Djs.ChannelType.GuildText,
						Djs.ChannelType.PrivateThread,
						Djs.ChannelType.GuildForum
					)
			);
		const components = [charNameInput, avatarInputs];
		if (!this.selfRegister || isModerator)
			//set the userIdInput in the first position if selfRegister is false or the user is a moderator
			components.unshift(userIdInputs);
		if (!this.selfRegister?.toString().endsWith("_channel") || isModerator)
			components.push(channelIdInput);
		if (this.havePrivate && isModerator) {
			const privateInput: Djs.LabelBuilder = new Djs.LabelBuilder()
				.setLabel(this.ul("modals.private.name"))
				.setDescription(this.ul("modals.private.description"))
				.setTextInputComponent(
					new Djs.TextInputBuilder()
						.setCustomId("private")
						.setRequired(false)
						.setValue("")
						.setStyle(Djs.TextInputStyle.Short)
				);
			components.push(privateInput);
		}

		modal.setLabelComponents(components);
		await interaction.showModal(modal);
	}

	/**
	 * Handles a modal submission to register user statistics for a specific page
	 */
	async pageNumber(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		const pageNumberStr = interaction.customId.replace("page", "");
		if (!isNumber(pageNumberStr)) return;
		const template = await getTemplateByInteraction(interaction, this.client);
		if (!template) {
			await Messages.reply(interaction, {
				embeds: [
					Messages.embedError(
						this.ul("error.template.notFound", {
							guildId: interaction.guild?.name ?? interaction.guildId,
						}),
						this.ul
					),
				],
			});
			return;
		}
		const stats = new StatsFeature({
			interaction,
			interactionUser: this.interactionUser,
			template,
			ul: this.ul,
		});
		await stats.register(Number.parseInt(pageNumberStr, 10));
		profiler.stopProfiler();
	}

	/**
	 * Handles the submission of the first page of a statistics registration modal
	 */
	async firstPage(): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (
			!interaction.guild ||
			!interaction.channel ||
			interaction.channel.isDMBased() ||
			!this.client
		)
			return;
		const template = await getTemplateByInteraction(interaction, this.client);
		if (!template) return;
		await this.createFirstPage(template);
	}

	/**
	 * Creates and sends an embed summarizing user registration details from a modal interaction
	 */
	private async createFirstPage(template: StatisticalTemplate): Promise<void> {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		const channel = interaction.channel;
		if (!channel) throw new NoChannel();

		const selfRegister = selfRegisterAllowance(
			this.client.settings.get(interaction.guild!.id, "allowSelfRegister")
		);
		const moderator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		const user =
			!selfRegister.allowSelfRegister || moderator
				? interaction.fields.getSelectedUsers("userID", true)?.first()
				: interaction.user;

		if (!user) {
			await Messages.reply(interaction, {
				embeds: [Messages.embedError(this.ul("error.user.notFound"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}

		const allowCustomChannel =
			(!selfRegister.disallowChannel && selfRegister.allowSelfRegister) || moderator;

		const customChannel = allowCustomChannel
			? interaction.fields
					.getSelectedChannels("channelId", false, [
						Djs.ChannelType.PublicThread,
						Djs.ChannelType.GuildText,
						Djs.ChannelType.PrivateThread,
						Djs.ChannelType.GuildForum,
					])
					?.first()
			: undefined;

		const charName = interaction.fields.getTextInputValue("charName");

		const isPrivate =
			this.client.settings.get(interaction.guild!.id, "privateChannel") && moderator // Allow private channel only if the user is a moderator
				? interaction.fields.getTextInputValue("private")?.toLowerCase() === "x"
				: false;
		const avatar = interaction.fields.getUploadedFiles("avatarFile")?.first();
		const files = [];
		let avatarStr = "";
		if (avatar?.contentType?.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS)) {
			const avatarAttachment = new Djs.AttachmentBuilder(avatar.url, {
				name: avatar.name,
			});
			files.push(avatarAttachment);
			avatarStr = `attachment://${avatarAttachment.name}`;
		} else if (avatar && !avatar.contentType?.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS))
			avatarStr = "error";

		let sheetId = this.client.settings.get(interaction.guild!.id, "managerId");
		const privateChannel = this.client.settings.get(
			interaction.guild!.id,
			"privateChannel"
		);
		if (isPrivate && privateChannel) sheetId = privateChannel;
		if (customChannel) sheetId = customChannel.id;

		let verifiedAvatar = avatarStr.length > 0 ? verifyAvatarUrl(avatarStr) : null;
		if (avatarStr === "error") verifiedAvatar = false;
		const existChannel = sheetId
			? await fetchChannel(
					interaction.guild!,
					sheetId,
					customChannel as GuildBasedChannel | undefined
				)
			: undefined;
		if (!existChannel) {
			await Messages.reply(interaction, {
				embeds: [Messages.embedError(this.ul("error.channel.thread"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const embed = new Djs.EmbedBuilder()
			.setTitle(this.ul("embed.add"))
			.setThumbnail(
				verifiedAvatar ? avatarStr : await fetchAvatarUrl(interaction.guild!, user)
			)
			.setFooter({ text: this.ul("common.page", { nb: 1 }) })
			.addFields(
				{
					inline: true,
					name: this.ul("common.charName"),
					value: charName.length > 0 ? charName : this.ul("common.noSet"),
				},
				{
					inline: true,
					name: this.ul("common.user"),
					value: Djs.userMention(user.id),
				},
				{
					inline: true,
					name: this.ul("common.isPrivate"),
					value: isPrivate ? "✓" : "✕",
				}
			);
		if (sheetId) {
			embed.addFields({ inline: true, name: "_ _", value: "_ _" });
			embed.addFields({
				inline: true,
				name: this.ul("common.channel").capitalize(),
				value: `${Djs.channelMention(sheetId as string)}`,
			});
			embed.addFields({ inline: true, name: "_ _", value: "_ _" });
		}

		//add continue button
		if (template.statistics) {
			await Messages.reply(interaction, {
				components: [continueCancelButtons(this.ul)],
				content:
					verifiedAvatar !== false
						? ""
						: `:warning: **${this.ul("error.avatar.url")}** \n-# *${this.ul("edit_avatar.default")}*`,
				embeds: [embed],
				files,
			});
			return;
		}
		const allButtons = MacroFeature.buttons(
			this.ul,
			selfRegister.moderation && !moderator
		);

		await Messages.reply(interaction, { components: [allButtons], embeds: [embed] });
		profiler.stopProfiler();
	}

	/**
	 * Interaction to continue to the next page of the statistics when registering a new user
	 */
	async continuePage(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template) return;

		const isModerator =
			this.selfRegister ||
			interaction.guild?.members.cache
				.get(this.interactionUser.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (!isModerator) {
			await Messages.reply(interaction, {
				content: this.ul("modals.noPermission"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const pageNumberStr = interaction.customId.replace("page", "");
		const page = !isNumber(pageNumberStr) ? 1 : Number.parseInt(pageNumberStr, 10);
		const embed = Messages.getEmbeds(interaction.message, "user");
		if (!embed || !this.template.statistics) return;
		const statsEmbed =
			Messages.getEmbeds(interaction.message, "stats") ??
			Messages.createStatsEmbed(this.ul);
		const allTemplateStat = Object.keys(this.template.statistics).map((stat) =>
			stat.unidecode()
		);

		const statsAlreadySet = Object.keys(
			parseEmbedFields(statsEmbed.toJSON() as Djs.Embed, false)
		)
			.filter((stat) => allTemplateStat.includes(stat.unidecode()))
			.map((stat) => stat.unidecode());
		if (statsAlreadySet.length === allTemplateStat.length) {
			await Messages.reply(interaction, {
				content: this.ul("modals.alreadySet"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const stats = new StatsFeature({
			interaction,
			interactionUser: this.interactionUser,
			template: this.template,
			ul: this.ul,
		});
		await stats.show(statsAlreadySet, page + 1);
	}

	/**
	 * Validate the user and create the embeds when the button is clicked
	 */
	async button(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template || !this.client || !this.characters) return;

		const selfAllow = this.client.settings.get(
			interaction.guild!.id,
			"allowSelfRegister"
		);
		const selfRegisterAllow = selfAllow ? /true/.test(selfAllow.toString()) : false;
		const isModerator =
			selfRegisterAllow ||
			interaction.guild?.members.cache
				.get(this.interactionUser.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (isModerator) await this.validateUser();
		else {
			let notAllowedMsg = this.ul("modals.noPermission");
			notAllowedMsg += `\n${this.ul("modals.onlyModerator")}`;
			await this.sendValidationMessage();
			await Messages.reply(interaction, {
				content: notAllowedMsg,
				flags: Djs.MessageFlags.Ephemeral,
			});
		}
	}

	/**
	 * Sends a validation message to moderators or the owner
	 */
	async sendValidationMessage(url?: string): Promise<void> {
		const interaction = this.interaction as
			| Djs.ButtonInteraction
			| Djs.ModalSubmitInteraction;
		if (!this.client) return;

		const logChannel = this.client.settings.get(interaction.guild!.id, "logs");
		if (!url) url = interaction.message?.url ?? "";
		if (logChannel)
			await Messages.sendLogs(
				this.ul("logs.validationWaiting", {
					role: `\n-# ${pingModeratorRole(interaction.guild!)}`,
					url,
					user: `${this.interactionUser.id}`,
				}),
				interaction.guild!,
				this.client.settings,
				true
			);
		else {
			//send a message in system channel if any
			const systemChannel = interaction.guild?.safetyAlertsChannel;
			if (systemChannel?.isSendable()) {
				await systemChannel.send({
					content: this.ul("logs.validationWaiting", {
						role: `\n-# ${pingModeratorRole(interaction.guild!)}`,
						url,
						user: `${this.interactionUser.id}`,
					}),
				});
			} else {
				//send a DM to the owner
				const owner = await interaction.guild?.fetchOwner();
				if (owner) {
					try {
						await owner.send({
							content: this.ul("logs.validationWaiting", {
								role: "",
								url,
								user: `${this.interactionUser.id}`,
							}),
						});
					} catch (e) {
						logger.warn(e, "button: can't send DM to the owner");
					}
				}
			}
		}
	}

	/**
	 * Validates a user's registration and compiles their statistics
	 */
	private async validateUser(): Promise<void> {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template || !this.client || !this.characters) return;

		const userEmbed = Messages.getEmbeds(interaction.message, "user");
		if (!userEmbed) throw new NoEmbed();
		const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
		const jsonThumbnail = userEmbed.toJSON().thumbnail?.url;
		let userID = oldEmbedsFields?.["common.user"];
		let charName: string | undefined = oldEmbedsFields?.["common.charName"];
		const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
		const channelToPost = oldEmbedsFields?.["common.channel"];
		if (channelToPost) {
			const channel = await fetchChannel(
				interaction.guild!,
				getIdFromMention(channelToPost) ||
					channelToPost.replace(MENTION_ID_DETECTION, "$1")
			);
			if (!channel) {
				await Messages.reply(interaction, {
					embeds: [
						Messages.embedError(
							this.ul("error.channel.notFound", { channel: channelToPost }),
							this.ul
						),
					],
					flags: Djs.MessageFlags.Ephemeral,
				});
				return;
			}
		}
		if (charName && charName === "common.noSet") charName = undefined;
		if (!userID) {
			await Messages.reply(interaction, {
				embeds: [Messages.embedError(this.ul("error.user.notFound"), this.ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		userID = getIdFromMention(userID) || userID.replace(MENTION_ID_DETECTION, "$1");
		const files = interaction.message.attachments.map(
			(att) => new Djs.AttachmentBuilder(att.url, { name: att.name })
		);
		let avatarStr = jsonThumbnail || "";
		if (jsonThumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
			const fileName = jsonThumbnail.split("?")[0].split("/").pop() || `${userID}_avatar`;
			const result = await reuploadAvatar(
				{ name: fileName, url: jsonThumbnail },
				this.ul
			);
			avatarStr = result.name;
			files.push(result.newAttachment);
		}
		//prevent duplicate files
		const uniqueFiles = Array.from(new Set(files.map((f) => f.name))).map(
			(name) => files.find((f) => f.name === name)!
		);
		const userDataEmbed = Messages.createUserEmbed(this.ul, avatarStr, userID, charName);
		const oldDiceEmbeds = Messages.getEmbeds(interaction.message, "damage");
		const oldStatsEmbed = Messages.getEmbeds(interaction.message, "stats");
		const oldDiceEmbedsFields = oldDiceEmbeds
			? (oldDiceEmbeds.toJSON().fields ?? [])
			: [];
		const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
		let diceEmbed: Djs.EmbedBuilder | undefined;
		let statsEmbed: Djs.EmbedBuilder | undefined;
		for (const field of oldDiceEmbedsFields) {
			if (!diceEmbed) diceEmbed = Messages.createDiceEmbed(this.ul);

			diceEmbed.addFields({
				inline: true,
				name: field.name.unidecode(true).capitalize(),
				value:
					field.value && field.value.trim().length > 0 ? `\`${field.value}\`` : "_ _",
			});
		}
		for (const field of statEmbedsFields) {
			if (!statsEmbed) {
				statsEmbed = Messages.createStatsEmbed(this.ul);
			}
			statsEmbed.addFields({
				inline: true,
				name: field.name.unidecode(true).capitalize(),
				value: field.value,
			});
		}

		const parsedStats = statsEmbed
			? parseEmbedFields(statsEmbed.toJSON() as Djs.Embed, false)
			: undefined;
		const stats: Record<string, number> = {};
		for (const [name, value] of Object.entries(parsedStats ?? {})) {
			let statValue = Number.parseInt(value, 10);
			if (!isNumber(value)) {
				statValue = Number.parseInt(
					value.removeBacktick().split("=")[1].trim().removeBacktick().standardize(),
					10
				);
			}
			stats[name] = statValue;
		}

		const macroFields = diceEmbed?.toJSON().fields ?? [];
		let templateMacro: Record<string, string> | undefined;
		if (macroFields.length > 0) {
			templateMacro = {};

			for (const damage of macroFields) {
				if (damage.value.trim().length === 0) continue;
				templateMacro[damage.name.unidecode(true)] = damage.value;
			}
		}
		// Add the template damage to the user if exists
		for (const [name, dice] of Object.entries(this.template.damage ?? {})) {
			if (!templateMacro) templateMacro = {};
			templateMacro[name] = dice;
			if (!diceEmbed) diceEmbed = Messages.createDiceEmbed(this.ul);

			//prevent duplicate fields in the dice embed
			if (MacroFeature.findDuplicate(diceEmbed, name)) continue;
			diceEmbed.addFields({
				inline: true,
				name: `${name}`,
				value: dice.trim().length > 0 ? `\`${dice}\`` : "_ _",
			});
		}
		const userStatistique: UserData = {
			avatar: jsonThumbnail ? cleanAvatarUrl(jsonThumbnail) : undefined,
			damage: templateMacro,
			private: isPrivate,
			stats,
			template: {
				critical: this.template.critical,
				customCritical: this.template.customCritical,
				diceType: this.template.diceType,
			},
			userName: charName,
		};
		let templateEmbed: Djs.EmbedBuilder | undefined;
		if (
			(this.template.diceType && this.template.diceType.length > 0) ||
			!allValueUndefOrEmptyString(this.template.critical) ||
			!allValueUndefOrEmptyString(this.template.customCritical)
		) {
			templateEmbed = Messages.createTemplateEmbed(this.ul);
			if (this.template.diceType && this.template.diceType.length > 0)
				templateEmbed.addFields({
					inline: true,
					name: this.ul("common.dice").capitalize(),
					value: `\`${this.template.diceType}\``,
				});
			if (this.template.critical?.success) {
				templateEmbed.addFields({
					inline: true,
					name: this.ul("roll.critical.success"),
					value: `\`${this.template.critical.success}\``,
				});
			}
			if (this.template.critical?.failure) {
				templateEmbed.addFields({
					inline: true,
					name: this.ul("roll.critical.failure"),
					value: `\`${this.template.critical.failure}\``,
				});
			}
			const criticalTemplate = this.template.customCritical ?? {};
			templateEmbed = Messages.createCustomCritical(templateEmbed, criticalTemplate);
		}
		const allEmbeds = Messages.createEmbedsList(
			userDataEmbed,
			statsEmbed,
			diceEmbed,
			templateEmbed
		);

		await Messages.repostInThread(
			allEmbeds,
			interaction,
			userStatistique,
			userID,
			this.ul,
			{ dice: !!diceEmbed, stats: !!statsEmbed, template: !!templateEmbed },
			this.client.settings,
			getIdFromMention(channelToPost) ?? channelToPost.replace("<#", "").replace(">", ""),
			this.characters,
			uniqueFiles
		);
		try {
			await interaction.message.delete();
		} catch (e) {
			logger.warn(e, "validateUser: can't delete the message");
		}
		await addAutoRole(
			interaction,
			userID,
			!!diceEmbed,
			!!statsEmbed,
			this.client.settings
		);
		await Messages.reply(interaction, {
			content: this.ul("modals.finished"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
}
