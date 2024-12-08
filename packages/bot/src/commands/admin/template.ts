// noinspection SuspiciousTypeOfGuard

import {
	type Critical,
	type Statistic,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import { cmdLn, ln, t } from "@dicelette/localization";
import { type GuildData, TUTORIAL_IMAGES } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import {
	bulkDeleteCharacters,
	bulkEditTemplateUser,
	createDefaultThread,
	embedError,
	reply,
} from "messages";

export const generateTemplate = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("generate.name"))
		.setNameLocalizations(cmdLn("generate.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescription(t("generate.description"))
		.setDescriptionLocalizations(cmdLn("generate.description"))
		.addStringOption((option) =>
			option
				.setName(t("generate.options.stats.name"))
				.setNameLocalizations(cmdLn("generate.options.stats.name"))
				.setDescription(t("generate.options.stats.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.stats.description"))
				.setRequired(false)
		)

		.addStringOption((option) =>
			option
				.setName(t("generate.options.dice.name"))
				.setDescription(t("generate.options.dice.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.dice.description"))
				.setNameLocalizations(cmdLn("generate.options.dice.name"))
				.setRequired(false)
		)

		.addNumberOption((option) =>
			option
				.setName(t("generate.options.total.name"))
				.setDescription(t("generate.options.total.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.total.description"))
				.setNameLocalizations(cmdLn("generate.options.total.name"))
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("generate.options.character.name"))
				.setDescription(t("generate.options.character.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.character.description"))
				.setNameLocalizations(cmdLn("generate.options.character.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("generate.options.critical_success.name"))
				.setDescription(t("generate.options.critical_success.description"))
				.setDescriptionLocalizations(
					cmdLn("generate.options.critical_success.description")
				)
				.setNameLocalizations(cmdLn("generate.options.critical_success.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("generate.options.critical_fail.name"))
				.setNameLocalizations(cmdLn("generate.options.critical_fail.name"))
				.setDescription(t("generate.options.critical_fail.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.critical_fail.description"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("generate.options.damage.name"))
				.setDescription(t("generate.options.damage.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.damage.description"))
				.setNameLocalizations(cmdLn("generate.options.damage.name"))
				.setRequired(false)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const lang = client.settings.get(interaction.guild.id, "lang") ?? interaction.locale;
		const ul = ln(lang);
		const name = options.getString(t("generate.options.stats.name")) ?? undefined;
		let statServer: Statistic | undefined = undefined;
		if (name) {
			const statistiqueName = name.split(/[, ]+/);
			statServer = {};
			for (const stat of statistiqueName) {
				statServer[stat] = {
					max: 0,
					min: 0,
					combinaison: "",
				};
			}
		}

		const atqName = options.getString(t("generate.options.damage.name"));
		let atqDice: Record<string, string> | undefined = undefined;
		if (atqName) {
			const atq = atqName.split(/[, ]+/);
			atqDice = {};
			for (const name of atq) {
				atqDice[name] = "1d5";
			}
		}
		let critical: Critical | undefined = {
			failure: options.getNumber(t("generate.options.critical_fail.name")) ?? undefined,
			success:
				options.getNumber(t("generate.options.critical_success.name")) ?? undefined,
		};
		//verify if everything is undefined in comparator object
		const isUndefined = Object.values(critical).every((value) => value == null);
		if (isUndefined) critical = undefined;

		const statistiqueTemplate: StatisticalTemplate = {
			charName: options.getBoolean(t("generate.options.character.name")) || false,
			statistics: statServer,
			diceType: options.getString(t("generate.options.dice.name")) || undefined,
			critical,
			total: options.getNumber(t("generate.options.total.name")) || undefined,
			damage: atqDice,
		};
		const help = dedent(ul("generate.help"));
		await reply(interaction, {
			content: help,
			files: [
				{
					attachment: Buffer.from(JSON.stringify(statistiqueTemplate, null, 2), "utf-8"),
					name: "template.json",
				},
			],
		});
	},
};

export const registerTemplate = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("register.name"))
		.setNameLocalizations(cmdLn("register.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescription(t("register.description"))
		.setDescriptionLocalizations(cmdLn("register.description"))
		.addChannelOption((option) =>
			option
				.setName(t("common.channel"))
				.setDescription(t("register.options.channel"))
				.setNameLocalizations(cmdLn("common.channel"))
				.setDescriptionLocalizations(cmdLn("register.options.channel"))
				.setRequired(true)
				.addChannelTypes(
					Djs.ChannelType.PublicThread,
					Djs.ChannelType.GuildText,
					Djs.ChannelType.PrivateThread
				)
		)
		.addAttachmentOption((option) =>
			option
				.setName(t("register.options.template.name"))
				.setDescription(t("register.options.template.description"))
				.setNameLocalizations(cmdLn("register.options.template.name"))
				.setDescriptionLocalizations(cmdLn("register.options.template.description"))
				.setRequired(true)
		)
		.addChannelOption((option) =>
			option
				.setName(t("register.options.public.name"))
				.setDescription(t("register.options.public.description"))
				.setNameLocalizations(cmdLn("register.options.public.name"))
				.setDescriptionLocalizations(cmdLn("register.options.public.description"))
				.setRequired(false)
				.addChannelTypes(
					Djs.ChannelType.PublicThread,
					Djs.ChannelType.GuildText,
					Djs.ChannelType.PrivateThread,
					Djs.ChannelType.GuildForum
				)
		)
		.addChannelOption((option) =>
			option
				.setName(t("register.options.private.name"))
				.setDescription(t("register.options.private.description"))
				.setNameLocalizations(cmdLn("register.options.private.name"))
				.setDescriptionLocalizations(cmdLn("register.options.private.description"))
				.setRequired(false)
				.addChannelTypes(
					Djs.ChannelType.PublicThread,
					Djs.ChannelType.GuildText,
					Djs.ChannelType.PrivateThread,
					Djs.ChannelType.GuildForum
				)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("register.options.update.name"))
				.setDescription(t("register.options.update.description"))
				.setNameLocalizations(cmdLn("register.options.update.name"))
				.setDescriptionLocalizations(cmdLn("register.options.update.description"))
		)
		.addBooleanOption((option) =>
			option
				.setName(t("register.options.delete.name"))
				.setDescription(t("register.options.delete.description"))
				.setNameLocalizations(cmdLn("register.options.delete.name"))
				.setDescriptionLocalizations(cmdLn("register.options.delete.description"))
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true });
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const langToUse =
			client.settings.get(interaction.guild!.id, "lang") ??
			interaction.guild?.preferredLocale ??
			interaction.locale;
		const ul = ln(langToUse);

		const template = options.getAttachment(t("register.options.template.name"), true);
		//fetch the template
		if (!template.contentType?.includes("json")) {
			await reply(interaction, {
				embeds: [embedError(ul("error.template"), ul)],
				ephemeral: true,
			});
			return;
		}
		const allowedChannelType = [
			Djs.ChannelType.PublicThread,
			Djs.ChannelType.GuildText,
			Djs.ChannelType.PrivateThread,
		];
		const res = await fetch(template.url).then((res) => res.json());
		const templateData = verifyTemplateValue(res);
		const guildId = interaction.guild.id;
		const channel = options.getChannel(t("common.channel"), true, allowedChannelType) as
			| Djs.AnyThreadChannel
			| Djs.TextChannel;

		let publicChannel = options.getChannel(t("register.options.public.name"), false);
		const privateChannel = options.getChannel(t("register.options.private.name"), false);
		if (channel instanceof Djs.TextChannel && !publicChannel) {
			publicChannel = await createDefaultThread(
				channel,
				client.settings,
				interaction,
				false
			);
		} else if (!(channel instanceof Djs.BaseGuildTextChannel) && !publicChannel) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.public", { chan: Djs.channelMention(channel.id) }), ul),
				],
				ephemeral: true,
			});
			return;
		}
		if (!publicChannel) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.public", { chan: Djs.channelMention(channel.id) }), ul),
				],
				ephemeral: true,
			});
			return;
		}

		const button = new Djs.ButtonBuilder()
			.setCustomId("register")
			.setLabel(ul("register.button"))
			.setStyle(Djs.ButtonStyle.Primary);
		const components = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
			button
		);
		const embedTemplate = new Djs.EmbedBuilder()
			.setTitle(ul("register.embed.title"))
			.setDescription(ul("register.embed.description"))
			.setThumbnail(
				"https://github.com/dicelette/discord-dicelette/blob/main/assets/template.png?raw=true"
			)
			.setColor("Random");

		//if there are ~25 stats we need to create an embed for it, so go to multiple embed, as user was done.
		let statisticsEmbed: undefined | Djs.EmbedBuilder = undefined;
		if (templateData.statistics) {
			statisticsEmbed = new Djs.EmbedBuilder()
				.setTitle(ul("common.statistics").capitalize())
				.setThumbnail(
					"https://github.com/dicelette/discord-dicelette/blob/main/assets/player.png?raw=true"
				);
			for (const [stat, value] of Object.entries(templateData.statistics)) {
				const min = value.min;
				const max = value.max;
				const combinaison = value.combinaison;
				let msg = "";
				if (combinaison)
					msg += `- Combinaison${ul("common.space")}: \`${combinaison}\`\n`;
				if (min) msg += `- Min${ul("common.space")}: \`${min}\`\n`;
				if (max) msg += `- Max${ul("common.space")}: \`${max}\`\n`;
				if (msg.length === 0) msg = ul("register.embed.noValue");
				statisticsEmbed.addFields({
					name: stat.capitalize(),
					value: msg,
					inline: true,
				});
			}
		}

		if (templateData.diceType)
			embedTemplate.addFields({
				name: ul("common.dice").capitalize(),
				value: `\`${templateData.diceType}\``,
			});
		let msgComparator = "";
		if (templateData.critical) {
			if (templateData.critical.success)
				msgComparator += `- ${ul("roll.critical.success")}${ul("common.space")}: \`${templateData.critical.success}\`\n`;
			if (templateData.critical.failure)
				msgComparator += `- ${ul("roll.critical.failure")}${ul("common.space")}: \`${templateData.critical.failure}\`\n`;
			embedTemplate.addFields({
				name: ul("register.embed.comparator"),
				value: msgComparator,
			});
		}
		if (templateData.customCritical) {
			for (const [name, value] of Object.entries(templateData.customCritical)) {
				const nameCritical = value.onNaturalDice
					? `(N) ${name.capitalize()}`
					: name.capitalize();
				embedTemplate.addFields({
					name: nameCritical,
					value: `\`${value.sign}${value.value}\``,
				});
			}
		}
		if (templateData.total)
			embedTemplate.addFields({
				name: ul("common.total"),
				value: `\`${templateData.total}\``,
			});
		let diceEmbed: undefined | Djs.EmbedBuilder = undefined;
		if (templateData.damage) {
			diceEmbed = new Djs.EmbedBuilder()
				.setTitle(ul("embed.dice"))
				.setThumbnail(
					"https://raw.githubusercontent.com/dicelette/discord-dicelette/main/assets/dice.png"
				);
			for (const [dice, value] of Object.entries(templateData.damage))
				diceEmbed.addFields({
					name: dice.capitalize(),
					value: `\`${value}\``,
					inline: true,
				});
		}
		const embeds = [embedTemplate, statisticsEmbed, diceEmbed].filter(
			(embed) => embed !== undefined
		);
		const msg = await channel.send({
			content: "",
			embeds: embeds as Djs.EmbedBuilder[],
			files: [
				{
					attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"),
					name: "template.json",
				},
			],
			components: [components],
		});
		await msg.pin();

		//save in database file
		const json = client.settings.get(guildId);
		const statsName = templateData.statistics
			? Object.keys(templateData.statistics)
			: undefined;
		const damageName = templateData.damage ? Object.keys(templateData.damage) : undefined;
		if (json) {
			if (json?.templateID?.messageId && json.templateID?.channelId) {
				try {
					const channel = await interaction.guild.channels.fetch(
						json.templateID.channelId
					);
					const msg = await (channel as Djs.TextChannel).messages.fetch(
						json.templateID.messageId
					);
					await msg.delete();
				} catch (e) {
					logger.warn(e, "registerTemplate: delete message");
				}
			}
			json.templateID = {
				channelId: channel.id,
				messageId: msg.id,
				statsName: statsName ?? [],
				damageName: damageName ?? [],
				valid: true,
			};
			json.managerId = publicChannel.id;

			if (privateChannel) json.privateChannel = privateChannel.id;
			client.settings.set(guildId, json);
		} else {
			const newData: GuildData = {
				lang: interaction.guild.preferredLocale ?? interaction.locale,
				managerId: undefined,
				templateID: {
					channelId: channel.id,
					messageId: msg.id,
					statsName: statsName ?? [],
					damageName: damageName ?? [],
					valid: true,
				},
				user: {},
			};
			client.settings.set(guildId, newData);
		}
		await reply(interaction, {
			content: ul("register.embed.registered"),
			files: downloadTutorialImages(),
		});
		if (options.getBoolean(t("register.options.update.name")))
			await bulkEditTemplateUser(client.settings, interaction, ul, templateData);
		else if (options.getBoolean(t("register.options.delete.name")))
			await bulkDeleteCharacters(client.settings, interaction, ul);
	},
};

function downloadTutorialImages() {
	const imageBufferAttachments: Djs.AttachmentBuilder[] = [];
	for (const url of TUTORIAL_IMAGES) {
		const index = TUTORIAL_IMAGES.indexOf(url);
		const newMessageAttachment = new Djs.AttachmentBuilder(url, {
			name: `tutorial_${index}.png`,
		});
		imageBufferAttachments.push(newMessageAttachment);
	}
	return imageBufferAttachments;
}
