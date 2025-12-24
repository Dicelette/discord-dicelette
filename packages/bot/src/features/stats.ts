import {
	buildModerationButtons,
	CUSTOM_ID_PREFIX,
	deleteModerationCache,
	fetchChannel,
	fetchUser,
	getMessageWithKeyPart,
	getModerationCache,
	getUserId,
	makeEmbedKey,
	parseKeyFromCustomId,
	putModerationCache,
	reuploadAvatar,
	setModerationFooter,
} from "@dicelette/bot-helpers";
import {
	evalCombinaison,
	evalOneCombinaison,
	FormulaError,
	isNumber,
	type StatisticalTemplate,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { DataToFooter } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	getIdFromMention,
	isArrayEqual,
	logger,
	profiler,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import { getTemplateByInteraction, getUserNameAndChar, updateMemory } from "database";
import * as Djs from "discord.js";
import * as Messages from "messages";
import {
	createStatsEmbed,
	displayOldAndNewStats,
	getEmbeds,
	removeEmbedsFromList,
	replaceEmbedInList,
	reply,
	sendLogs,
} from "messages";
import {
	allowEdit,
	continueCancelButtons,
	editUserButtons,
	selfRegisterAllowance,
} from "utils";
import { BaseFeature } from "./base";
import { MacroFeature } from "./macro";
import { UserFeature } from "./user";

const botErrorOptionsModals: BotErrorOptions = {
	cause: "STAT_MODALS",
	level: BotErrorLevel.Warning,
};

const botErrorOptions: BotErrorOptions = {
	cause: "STAT_VALIDATION",
	level: BotErrorLevel.Warning,
};

/**
 * StatsFeature handles all statistics operations for characters.
 * This includes showing modals, registering stats, editing stats, and validation.
 */
export class StatsFeature extends BaseFeature {
	/**
	 * Modal to display the statistics when adding a new user.
	 * Will display the statistics that are not already set (5 statistics per page).
	 */
	async show(stats?: string[], page = 1, moderation = false) {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.template?.statistics) return;

		const ul = ln(interaction.locale as Djs.Locale);
		const isModerator =
			moderation &&
			!interaction.guild?.members.cache
				.get(interaction.user.id)
				?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		const statsWithoutCombinaison =
			Object.keys(this.template.statistics).filter((stat) => {
				return !this.template!.statistics?.[stat]?.combinaison;
			}) ?? [];
		const nbOfPages =
			Math.ceil(statsWithoutCombinaison.length / 5) >= 1
				? Math.ceil(statsWithoutCombinaison.length / 5) + 1
				: page;
		const modal = new Djs.ModalBuilder()
			.setCustomId(`page${page}`)
			.setTitle(ul("modals.steps", { max: nbOfPages + 1, page }));
		let statToDisplay = statsWithoutCombinaison;
		if (stats && stats.length > 0) {
			statToDisplay = statToDisplay.filter((stat) => !stats.includes(stat.unidecode()));
			if (statToDisplay.length === 0) {
				const button = MacroFeature.buttons(ul, isModerator);
				await reply(interaction, {
					content: ul("modals.alreadySet"),
					flags: Djs.MessageFlags.Ephemeral,
				});
				await interaction.message.edit({ components: [button] });
			}
		}
		const statsToDisplay = statToDisplay.slice(0, 4);
		const statisticsLowerCase = Object.fromEntries(
			Object.entries(this.template.statistics).map(([key, value]) => [
				key.standardize(),
				value,
			])
		);
		const inputs = [];
		for (const stat of statsToDisplay) {
			const cleanedName = stat.unidecode();
			const value = statisticsLowerCase[cleanedName];
			if (value.combinaison) continue;
			let msg = "";
			if (value.min && value.max)
				msg = ul("modals.enterValue.minAndMax", { max: value.max, min: value.min });
			else if (value.min) msg = ul("modals.enterValue.minOnly", { min: value.min });
			else if (value.max) msg = ul("modals.enterValue.maxOnly", { max: value.max });

			const input: Djs.LabelBuilder = new Djs.LabelBuilder()
				.setLabel(stat)
				.setTextInputComponent(
					new Djs.TextInputBuilder()
						.setCustomId(cleanedName)
						.setRequired(true)
						.setStyle(Djs.TextInputStyle.Short)
				);
			if (msg.length) input.setDescription(msg);
			inputs.push(input);
		}
		modal.setLabelComponents(...inputs);
		await interaction.showModal(modal);
	}

	/**
	 * The button that triggers the stats editor.
	 */
	async edit() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;

		if (await allowEdit(interaction, this.db, this.interactionUser))
			await this.showEditorStats();
	}

	/**
	 * Displays a modal allowing the user to edit their statistics.
	 * Retrieves the user's current statistics from the interaction message and formats them for editing.
	 */
	private async showEditorStats() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.db) return;

		const statistics = getEmbeds(interaction.message, "stats");
		if (!statistics)
			throw new BotError(this.ul("error.stats.notFound_plural"), botErrorOptionsModals);
		const stats = parseEmbedFields(statistics.toJSON() as Djs.Embed, false);
		const originalGuildData = this.db.get(interaction.guild!.id, "templateID.statsName");
		const registeredStats = originalGuildData?.map((stat) => stat.unidecode());
		const userStats = Object.keys(stats).map((stat) => stat.unidecode());
		let statsStrings = "";
		for (const [name, value] of Object.entries(stats)) {
			let stringValue = value;
			if (!registeredStats?.includes(name.unidecode())) continue;
			if (value.match(/=/)) {
				const combinaison = value.split("=")?.[0].trim();
				if (combinaison) stringValue = combinaison;
			}
			statsStrings += `- ${name}${this.ul("common.space")}: ${stringValue}\n`;
		}
		if (
			!isArrayEqual(registeredStats, userStats) &&
			registeredStats &&
			registeredStats.length > userStats.length
		) {
			const diff = registeredStats.filter((x) => !userStats.includes(x));
			for (const stat of diff) {
				const realName = originalGuildData?.find(
					(x) => x.unidecode() === stat.unidecode()
				);
				statsStrings += `- ${realName?.capitalize()}${this.ul("common.space")}: 0\n`;
			}
		}

		const modal = new Djs.ModalBuilder()
			.setCustomId("editStats")
			.setTitle(this.ul("common.statistics").capitalize());
		const input: Djs.LabelBuilder = new Djs.LabelBuilder()
			.setLabel(this.ul("common.statistics").capitalize())
			.setDescription(this.ul("modals.edit.stats"))
			.setTextInputComponent(
				new Djs.TextInputBuilder()
					.setCustomId("allStats")
					.setRequired(true)
					.setStyle(Djs.TextInputStyle.Paragraph)
					.setValue(statsStrings)
			);
		modal.setLabelComponents(input);
		await interaction.showModal(modal);
	}

	/**
	 * Handles a modal submission to register new user statistics and updates the corresponding Discord message embeds.
	 */
	async register(page: number | undefined = 2, moderation = false) {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.template || !interaction.message) return;

		const message = interaction.message;
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const userEmbed = getEmbeds(message, "user");
		if (!userEmbed) return;
		const thumbnail = userEmbed.toJSON().thumbnail?.url;
		const files = message.attachments.map(
			(att) => new Djs.AttachmentBuilder(att.url, { name: att.name })
		);
		if (thumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
			const fileName = thumbnail.split("?")[0].split("/").pop() || "avatar.png";
			const result = await reuploadAvatar({ name: fileName, url: thumbnail }, this.ul);
			userEmbed.setThumbnail(result.name);
			files.push(result.newAttachment);
		}
		const uniqueFiles = Array.from(new Set(files.map((f) => f.name))).map(
			(name) => files.find((f) => f.name === name)!
		);
		const statsEmbed = getEmbeds(message, "stats");
		const oldStatsTotal = (statsEmbed?.toJSON().fields ?? [])
			.filter((field) => isNumber(field.value.removeBacktick()))
			.reduce((sum, field) => sum + Number.parseInt(field.value.removeBacktick(), 10), 0);
		logger.trace(`Old stats total: ${oldStatsTotal}`);

		let combinaisonFields: Record<string, string>;
		let stats: Record<string, number>;
		const result = this.getStatistiqueFields(interaction, this.template);
		combinaisonFields = result.combinaisonFields;
		stats = result.stats;

		userEmbed.setFooter({ text: this.ul("common.page", { nb: page }) });

		const statEmbeds = statsEmbed ?? createStatsEmbed(this.ul);
		for (const [stat, value] of Object.entries(stats)) {
			statEmbeds.addFields({
				inline: true,
				name: stat.capitalize(),
				value: `\`${value}\``,
			});
		}
		const statsWithoutCombinaison = this.template.statistics
			? Object.keys(this.template.statistics)
					.filter((stat) => !this.template!.statistics![stat].combinaison)
					.map((name) => name.standardize())
			: [];
		const embedObject = statEmbeds.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: Record<string, string> = {};
		for (const field of fields) {
			parsedFields[field.name.standardize()] = field.value.removeBacktick().standardize();
		}

		const embedStats = Object.fromEntries(
			Object.entries(parsedFields).filter(([key]) =>
				statsWithoutCombinaison.includes(key)
			)
		);
		const nbStats = Object.keys(embedStats).length;
		const ilReste = this.calculateRemainingPoints(
			this.template.total,
			oldStatsTotal,
			stats
		);
		const allStatsFilled = nbStats === statsWithoutCombinaison.length;

		if (allStatsFilled && this.template.forceDistrib) {
			if (ilReste !== undefined && ilReste < 0) {
				const exceeded = Math.abs(ilReste);
				const errorMessage = this.ul("error.totalExceededBy", {
					max: exceeded,
					value: this.ul("common.statistics"),
				});
				await reply(interaction, {
					content: errorMessage,
					flags: Djs.MessageFlags.Ephemeral,
				});
				userEmbed.setFooter({ text: this.ul("common.page", { nb: 1 }) });
				await message.edit({
					components: [continueCancelButtons(this.ul)],
					embeds: [userEmbed],
					files: uniqueFiles,
				});
				return;
			}
			if (ilReste && ilReste > 0) {
				await reply(interaction, {
					content: this.ul("modals.stats.forceDistrib", { reste: ilReste }),
					flags: Djs.MessageFlags.Ephemeral,
				});
				userEmbed.setFooter({ text: this.ul("common.page", { nb: 1 }) });
				await message.edit({
					components: [continueCancelButtons(this.ul)],
					embeds: [userEmbed],
					files: uniqueFiles,
				});
				return;
			}
		}

		if (allStatsFilled) {
			let combinaison: Record<string, number>;
			combinaison = evalCombinaison(combinaisonFields, embedStats);
			for (const stat of Object.keys(combinaison)) {
				statEmbeds.addFields({
					inline: true,
					name: stat.capitalize(),
					value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
				});
			}
			userEmbed.setFooter({ text: this.ul("common.page", { nb: page + 1 }) });

			await message.edit({
				components: [MacroFeature.buttons(this.ul, moderation && !isModerator)],
				embeds: [userEmbed, statEmbeds],
				files: uniqueFiles,
			});
			await reply(interaction, {
				content: this.ul("modals.added.stats"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const restePoints = ilReste
			? (() => {
					const allowNegative = Object.values(this.template.statistics || {}).some(
						(stat) => stat.min !== undefined && stat.min < 0
					);
					const displayReste = allowNegative ? ilReste : Math.abs(ilReste);
					return `\n${this.ul("modals.stats.reste", { nbStats: statsWithoutCombinaison.length - nbStats, reste: displayReste, total: this.template.total })}`;
				})()
			: "";

		await message.edit({
			components: [continueCancelButtons(this.ul)],
			embeds: [userEmbed, statEmbeds],
			files: uniqueFiles,
		});
		await reply(interaction, {
			content: `${this.ul("modals.added.stats")}${restePoints}`,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	/**
	 * Get the statistiques fields from the modals and verify if all value are correct and if the total is not exceeded
	 */
	private getStatistiqueFields(
		interaction: Djs.ModalSubmitInteraction,
		templateData: StatisticalTemplate
	) {
		const combinaisonFields: Record<string, string> = {};
		const stats: Record<string, number> = {};
		if (!templateData.statistics) return { combinaisonFields, stats };
		for (const [key, value] of Object.entries(templateData.statistics)) {
			const name = key.standardize();
			if (!interaction.fields.fields.has(name) && !value.combinaison) continue;
			if (value.combinaison) {
				combinaisonFields[key] = value.combinaison;
				continue;
			}
			const statValue = interaction.fields.getTextInputValue(name);
			if (!statValue) continue;
			const num = Number.parseInt(statValue, 10);
			if (value.min && num < value.min)
				throw new BotError(
					this.ul("error.mustBeGreater", { min: value.min, value: name }),
					botErrorOptions
				);
			if (value.max && num > value.max)
				throw new BotError(
					this.ul("error.mustBeLower", { max: value.max, value: name }),
					botErrorOptions
				);
			// Only allow negative values if min is negative
			if (num < 0 && value.min !== undefined && value.min >= 0)
				throw new BotError(
					this.ul("error.mustBeGreater", { min: value.min ?? 0, value: name }),
					botErrorOptions
				);
			stats[key] = num;
		}
		return { combinaisonFields, stats };
	}

	private calculateRemainingPoints(
		total = 0,
		oldTotal = 0,
		stats?: Record<string, number>
	) {
		if (total === 0) return undefined;
		const newTotal = stats
			? Object.values(stats).reduce((sum, value) => sum + value, 0)
			: 0;
		return total - oldTotal - newTotal;
	}

	private async getFromModal() {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client || !interaction.message) return;

		const message = interaction.message;
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const statsEmbeds = getEmbeds(message ?? undefined, "stats");
		if (!statsEmbeds) return;
		return {
			fieldsToAppend: await this.getFieldsToAppend(statsEmbeds),
			message,
			statsEmbeds,
		};
	}

	/**
	 * Validates and updates user statistics from a modal submission, editing the stats embed in the Discord message.
	 */
	async validateEdit(
		data?: {
			fieldsToAppend?: Djs.APIEmbedField[];
			statsEmbeds: Djs.EmbedBuilder;
			message: Djs.Message;
		},
		userData?: {
			userID: string;
			userName?: string;
		}
	) {
		const interaction = this.interaction;
		if (!this.client) return;

		const db = this.client.settings;
		const characters = this.client.characters;
		if (interaction.isModalSubmit()) data = await this.getFromModal();

		if (!data) return;
		const { fieldsToAppend, statsEmbeds, message } = data;
		// Distinguish between `undefined` (no data) and an empty array (explicit removal)
		if (fieldsToAppend === undefined) return;
		const newEmbedStats = createStatsEmbed(this.ul).addFields(fieldsToAppend);
		if (!userData)
			userData = await getUserNameAndChar(
				interaction as Djs.ModalSubmitInteraction | Djs.ButtonInteraction,
				this.ul
			);
		const { userID, userName } = userData;
		if (!fieldsToAppend || fieldsToAppend.length === 0) {
			const { list, exists, files } = await replaceEmbedInList(
				this.ul,
				{ embed: newEmbedStats, which: "stats" },
				message
			);
			const toAdd = removeEmbedsFromList(list, "stats");
			const components = editUserButtons(this.ul, false, exists.damage);
			await message.edit({ components: [components], embeds: toAdd, files });
			await reply(
				interaction as
					| Djs.ModalSubmitInteraction
					| Djs.ButtonInteraction
					| Djs.CommandInteraction
					| Djs.StringSelectMenuInteraction,
				{
					content: this.ul("modals.removed.stats"),
					flags: Djs.MessageFlags.Ephemeral,
				}
			);
			await sendLogs(
				this.ul("logs.stats.removed", {
					char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
					fiche: message.url,
					user: Djs.userMention(interaction.user.id),
				}),
				interaction.guild as Djs.Guild,
				db
			);
			// Stop here: we handled the explicit empty-fields (removal) case
			return;
		}
		const { list, files } = await replaceEmbedInList(
			this.ul,
			{ embed: newEmbedStats, which: "stats" },
			message
		);
		await message.edit({ embeds: list, files });
		const compare = displayOldAndNewStats(statsEmbeds.toJSON().fields, fieldsToAppend);
		const count = compare.added + compare.changed + compare.removed;

		await reply(
			interaction as
				| Djs.ModalSubmitInteraction
				| Djs.ButtonInteraction
				| Djs.CommandInteraction
				| Djs.StringSelectMenuInteraction,
			{
				content: this.ul("embed.edit.stats", {
					count,
				}),
				flags: Djs.MessageFlags.Ephemeral,
			}
		);
		const logMessage = this.ul("logs.stats.added", {
			char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			count,
			fiche: message.url,
			user: Djs.userMention(interaction.user.id),
		});
		await sendLogs(`${logMessage}\n${compare.stats}`, interaction.guild as Djs.Guild, db);
		await updateMemory(characters, interaction.guild!.id, userID, this.ul, {
			embeds: list,
		});
	}

	private async getFieldsToAppend(statsEmbeds: Djs.EmbedBuilder) {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		const values = interaction.fields.getTextInputValue("allStats");
		const templateStats = await getTemplateByInteraction(interaction, this.client);
		if (!templateStats || !templateStats.statistics) return;
		const valuesAsStats = values.split("\n- ").map((stat) => {
			const [name, value] = stat.split(/ ?: ?/);
			return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
		});
		const stats = valuesAsStats.reduce(
			(acc, { name, value }) => {
				acc[name] = value;
				return acc;
			},
			{} as Record<string, string>
		);
		const template = Object.fromEntries(
			Object.entries(templateStats.statistics).map(([name, value]) => [
				name.unidecode(),
				value,
			])
		);
		const embedsStatsFields: Djs.APIEmbedField[] = [];
		for (const [name, value] of Object.entries(stats)) {
			const stat = template?.[name.unidecode()];
			if (
				value.toLowerCase() === "x" ||
				value.trim().length === 0 ||
				embedsStatsFields.find((field) => field.name.unidecode() === name.unidecode())
			)
				continue;
			if (!stat)
				throw new BotError(
					this.ul("error.stats.notFound", { value: name }),
					botErrorOptions
				);

			if (!isNumber(value)) {
				const combinaison = Number.parseInt(evalOneCombinaison(value, stats), 10);
				if (!isNumber(combinaison)) {
					throw new FormulaError(value);
				}
				embedsStatsFields.push({
					inline: true,
					name: name.capitalize(),
					value: `\`${value}\` = ${combinaison}`,
				});
				continue;
			}
			const num = Number.parseInt(value, 10);
			if (stat.min && num < stat.min) {
				throw new BotError(
					this.ul("error.mustBeGreater", { min: stat.min, value: name }),
					botErrorOptions
				);
			}
			embedsStatsFields.push({
				inline: true,
				name: name.capitalize(),
				value: `\`${num}\``,
			});
		}
		const oldStats = statsEmbeds.toJSON().fields;
		if (oldStats) {
			for (const field of oldStats) {
				const name = field.name.toLowerCase();
				if (
					field.value !== "0" &&
					field.value.toLowerCase() !== "x" &&
					field.value.trim().length > 0 &&
					embedsStatsFields.find((field) => field.name.unidecode() === name.unidecode())
				) {
					embedsStatsFields.push({
						inline: true,
						name: name.capitalize(),
						value: field.value,
					});
				}
			}
		}
		const fieldsToAppend: Djs.APIEmbedField[] = [];
		for (const field of embedsStatsFields) {
			const name = field.name.toLowerCase();
			if (fieldsToAppend.find((f) => f.name.unidecode() === name.unidecode())) continue;
			fieldsToAppend.push(field);
		}
		return fieldsToAppend;
	}

	async validateByModeration() {
		const interaction = this.interaction as Djs.ModalSubmitInteraction;
		if (!this.client) return;

		profiler.startProfiler();
		const allowance = selfRegisterAllowance(
			this.client.settings.get(interaction.guild!.id, "allowSelfRegister")
		);
		const moderator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (!allowance.allowSelfRegister || moderator || !allowance.moderation) {
			await this.validateEdit();
			return;
		}
		if (!interaction.message) return;
		const message = interaction.message;
		const statsEmbeds = getEmbeds(message ?? undefined, "stats");
		if (!statsEmbeds) return;
		const fieldsToAppend = await this.getFieldsToAppend(statsEmbeds);
		if (!fieldsToAppend) return;
		const newEmbedStats = createStatsEmbed(this.ul).addFields(fieldsToAppend);
		const user = await getUserNameAndChar(interaction, this.ul);
		setModerationFooter(newEmbedStats, {
			channelId: interaction.message.channelId,
			messageId: interaction.message.id,
			userID: user.userID,
			userName: user.userName,
		});

		const embedKey = makeEmbedKey(
			interaction.guild!.id,
			interaction.message.channelId,
			interaction.message.id
		);
		putModerationCache(embedKey, {
			embed: newEmbedStats,
			kind: "stats-edit",
			meta: {
				channelId: interaction.message.channelId,
				messageId: interaction.message.id,
				userID: user.userID,
				userName: user.userName,
			},
		});

		const row = buildModerationButtons("stats-edit", this.ul, embedKey);
		await reply(interaction, { components: [row], embeds: [newEmbedStats] });
		const replyMessage = await interaction.fetchReply();
		const userFeature = new UserFeature({
			client: this.client,
			interaction,
			interactionUser: interaction.user,
			ul: this.ul,
		});
		await userFeature.sendValidationMessage(replyMessage.url);
		profiler.stopProfiler();
	}

	async couldBeValidated() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		const moderator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
		if (!moderator) {
			let notAllowedMsg = this.ul("modals.noPermission");
			notAllowedMsg += `\n${this.ul("modals.onlyModerator")}`;
			const userFeature = new UserFeature({
				client: this.client,
				interaction,
				interactionUser: this.interactionUser,
				ul: this.ul,
			});
			await userFeature.sendValidationMessage();
			await Messages.reply(interaction, {
				content: notAllowedMsg,
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.stats.validate, customId);

		if (!embedKey) {
			const replyIds = interaction.message.embeds[0]?.footer?.text;
			if (!replyIds) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
			const data: DataToFooter = JSON.parse(replyIds);
			const { channelId, messageId } = data;
			const userData = { userID: data.userID, userName: data.userName };
			logger.trace("Data from footer:", channelId, messageId);
			if (!channelId || !messageId)
				throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
			const channel = await fetchChannel(interaction.guild!, channelId);
			if (!channel || !channel.isTextBased())
				throw new BotError(this.ul("error.channel.notFound"), botErrorOptions);

			const message = await channel.messages.fetch(messageId);
			const oldStatsEmbed =
				getEmbeds(message ?? undefined, "stats") ?? createStatsEmbed(this.ul);
			const fieldsToAppend = interaction.message.embeds[0]?.toJSON().fields;
			if (!fieldsToAppend || !message)
				throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
			await this.validateEdit(
				{ fieldsToAppend, message, statsEmbeds: oldStatsEmbed },
				userData
			);
			await interaction.message.delete();
			return;
		}

		const cached = getModerationCache(embedKey);
		let embed = cached && cached.kind === "stats-edit" ? cached.embed : undefined;

		if (!embed) {
			const apiEmbed = interaction.message.embeds[0];
			if (!apiEmbed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
			embed = new Djs.EmbedBuilder(apiEmbed.toJSON() as Djs.APIEmbed);
		}
		//if (!embed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
		const message = await getMessageWithKeyPart(this.ul, interaction, embedKey);
		const oldStatsEmbed =
			getEmbeds(message ?? undefined, "stats") ?? createStatsEmbed(this.ul);
		const fieldsToAppend = embed.toJSON().fields;
		if (!fieldsToAppend || !message)
			throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
		const userEmbed = getEmbeds(message ?? undefined, "user");
		if (!userEmbed) throw new BotError(this.ul("error.embed.notFound"), botErrorOptions);
		const parsedFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
		const mention = parsedFields["common.user"];
		const ownerId = getIdFromMention(mention);
		const charNameRaw = parsedFields["common.character"];
		const ownerName =
			charNameRaw && charNameRaw.toLowerCase() !== this.ul("common.noSet").toLowerCase()
				? charNameRaw
				: undefined;
		await this.validateEdit(
			{ fieldsToAppend, message, statsEmbeds: oldStatsEmbed },
			ownerId ? { userID: ownerId, userName: ownerName } : undefined
		);
		deleteModerationCache(embedKey);
		await interaction.message.delete();
	}

	async cancelStatsModeration() {
		const interaction = this.interaction as Djs.ButtonInteraction;
		if (!this.client) return;

		const customId = interaction.customId;
		const embedKey = parseKeyFromCustomId(CUSTOM_ID_PREFIX.stats.cancel, customId);
		const { userId, url } = getUserId(interaction);
		if (embedKey) deleteModerationCache(embedKey);
		const samePerson = userId === interaction.user.id;
		const content = samePerson
			? this.ul("modals.cancelled_by_user", { url })
			: this.ul("modals.cancelled", { url });
		await interaction.message.delete();
		await reply(interaction, {
			content,
			flags: Djs.MessageFlags.Ephemeral,
		});
		if (userId && !samePerson) {
			const user = await fetchUser(this.client, userId);
			if (user)
				await user.send(
					this.ul("modals.cancelled", {
						url,
					})
				);
		}
	}
}
