import { warn } from "@console";
import {
	type Critical,
	type Statistic,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import type { GuildData } from "@interface";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { downloadTutorialImages, embedError, reply, title } from "@utils";
import { bulkEditTemplateUser } from "@utils/parse";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	channelMention,
	ChannelType,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	type Locale,
	PermissionFlagsBits,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import i18next from "i18next";
import { dedent } from "ts-dedent";

const t = i18next.getFixedT("en");

export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName(t("generate.name"))
		.setNameLocalizations(cmdLn("generate.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const ul = ln(interaction.locale as Locale);
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
		let atqDice: { [name: string]: string } | undefined = undefined;
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
	data: new SlashCommandBuilder()
		.setName(t("register.name"))
		.setNameLocalizations(cmdLn("register.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
					ChannelType.PublicThread,
					ChannelType.GuildText,
					ChannelType.PrivateThread
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
					ChannelType.PublicThread,
					ChannelType.GuildText,
					ChannelType.PrivateThread
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
					ChannelType.PublicThread,
					ChannelType.GuildText,
					ChannelType.PrivateThread
				)
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true });
		const options = interaction.options as CommandInteractionOptionResolver;
		const ul = ln(interaction.guild.preferredLocale ?? interaction.locale);

		const template = options.getAttachment(t("register.options.template.name"), true);
		//fetch the template
		if (!template.contentType?.includes("json")) {
			await reply(interaction, {
				embeds: [embedError(ul("error.template"), ul)],
				ephemeral: true,
			});
			return;
		}
		const res = await fetch(template.url).then((res) => res.json());
		const templateData = verifyTemplateValue(res);
		const guildId = interaction.guild.id;
		const channel = options.getChannel(t("common.channel"), true);
		const publicChannel = options.getChannel(t("register.options.public.name"), false);
		const privateChannel = options.getChannel(t("register.options.private.name"), false);
		if (
			(!(channel instanceof TextChannel) && !(channel instanceof ThreadChannel)) ||
			(!publicChannel && !(channel instanceof TextChannel))
		) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.public", { chan: channelMention(channel.id) }), ul),
				],
				ephemeral: true,
			});
			return;
		}

		const button = new ButtonBuilder()
			.setCustomId("register")
			.setLabel(ul("register.button"))
			.setStyle(ButtonStyle.Primary);
		const components = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
		const embedTemplate = new EmbedBuilder()
			.setTitle(ul("register.embed.title"))
			.setDescription(ul("register.embed.description"))
			.setThumbnail(
				"https://github.com/dicelette/discord-dicelette/blob/main/assets/template.png?raw=true"
			)
			.setColor("Random");

		//if there are ~25 stats we need to create an embed for it, so go to multiple embed, as user was done.
		let statisticsEmbed: undefined | EmbedBuilder = undefined;
		if (templateData.statistics) {
			statisticsEmbed = new EmbedBuilder()
				.setTitle(title(ul("common.statistics")))
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
					name: title(stat),
					value: msg,
					inline: true,
				});
			}
		}

		if (templateData.diceType)
			embedTemplate.addFields({
				name: title(ul("common.dice")),
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
		if (templateData.total)
			embedTemplate.addFields({
				name: ul("common.total"),
				value: `\`${templateData.total}\``,
			});
		let diceEmbed: undefined | EmbedBuilder = undefined;
		if (templateData.damage) {
			diceEmbed = new EmbedBuilder()
				.setTitle(ul("embed.dice"))
				.setThumbnail(
					"https://raw.githubusercontent.com/dicelette/discord-dicelette/main/assets/dice.png"
				);
			for (const [dice, value] of Object.entries(templateData.damage))
				diceEmbed.addFields({
					name: title(dice),
					value: `${value}`,
					inline: true,
				});
		}
		const embeds = [embedTemplate, statisticsEmbed, diceEmbed].filter(
			(embed) => embed !== undefined
		);
		const msg = await channel.send({
			content: "",
			embeds: embeds as EmbedBuilder[],
			files: [
				{
					attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"),
					name: "template.json",
				},
			],
			components: [components],
		});
		msg.pin();

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
					const msg = await (channel as TextChannel).messages.fetch(
						json.templateID.messageId
					);
					await msg.delete();
				} catch (e) {
					warn(e, "registerTemplate: delete message");
				}
			}
			json.templateID = {
				channelId: channel.id,
				messageId: msg.id,
				statsName: statsName ?? [],
				damageName: damageName ?? [],
			};
			if (publicChannel) json.managerId = publicChannel.id;
			if (privateChannel) json.privateChannel = privateChannel.id;
			client.settings.set(guildId, json);
		} else {
			const newData: GuildData = {
				templateID: {
					channelId: channel.id,
					messageId: msg.id,
					statsName: statsName ?? [],
					damageName: damageName ?? [],
				},
				user: {},
			};
			client.settings.set(guildId, newData);
		}
		await bulkEditTemplateUser(client.settings, interaction, ul, templateData);
		await reply(interaction, {
			content: ul("register.embed.registered"),
			files: await downloadTutorialImages(),
		});
	},
};
