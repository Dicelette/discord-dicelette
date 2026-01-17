import {
	fetchChannel,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { type GuildData, type Translation, TUTORIAL_IMAGES } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	capitalizeBetweenPunct,
	logger,
} from "@dicelette/utils";
import * as Djs from "discord.js";
import {
	bulkDeleteCharacters,
	bulkEditTemplateUser,
	createCustomCritical,
	createDefaultThread,
	embedError,
	reply,
} from "messages";
import { DATABASE_NAMES } from "../index";
import "discord_ext";
import process from "node:process";
import { interactionError } from "event";

const botErrorOptions: BotErrorOptions = {
	cause: "CUSTOM_CRITICAL",
	level: BotErrorLevel.Warning,
};

export const templateManager = {
	data: new Djs.SlashCommandBuilder()
		.setNames("common.template")
		.setContexts(Djs.InteractionContextType.Guild)

		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescriptions("template.description")
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("register.name")
				.setDescriptions("register.description")

				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("register.options.channel")
						.setRequired(true)
						.addChannelTypes(
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PrivateThread
						)
				)
				.addAttachmentOption((option) =>
					option
						.setNames("common.template")
						.setDescriptions("register.options.template.description")
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setNames("register.options.public.name")
						.setDescriptions("register.options.public.description")
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
						.setNames("register.options.private.name")
						.setDescriptions("register.options.private.description")
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
						.setNames("register.options.update.name")
						.setDescriptions("register.options.update.description")
				)
				.addBooleanOption((option) =>
					option
						.setNames("register.options.delete.name")
						.setDescriptions("register.options.delete.description")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("update.name")
				.setDescriptions("update.description")
				.addAttachmentOption((option) =>
					option
						.setNames("common.template")
						.setDescriptions("register.options.template.description")
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setNames("register.options.update.name")
						.setDescriptions("register.options.update.description")
				)
				.addBooleanOption((option) =>
					option
						.setNames("register.options.delete.name")
						.setDescriptions("register.options.delete.description")
				)
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		if (!interaction.guild) return;
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const { ul } = getLangAndConfig(client, interaction);
		const subcommand = options.getSubcommand(true);
		try {
			if (subcommand === t("register.name")) {
				await registerTemplate(options, interaction, ul, client);
			} else if (subcommand === t("update.name")) {
				await updateTemplateFile(options, interaction, ul, client);
			}
		} catch (e) {
			logger.fatal(e, "updateTemplateFile: error while updating template");
			const langToUse = getLangAndConfig(client, interaction).langToUse;
			await interactionError(client, interaction, e as BotError, ul, langToUse);
		}
	},
};

async function removeRestriction(guildId: string, client: EClient): Promise<void> {
	const guildCommmands = await client.application?.commands.fetch({ guildId });
	const cmds = guildCommmands?.filter((cmd) => DATABASE_NAMES.includes(cmd.name));
	/*
	for (const cmd of cmds?.values() ?? []) {
		logger.trace("Removing defaultMemberPermissions from command", cmd.name);
		await cmd.edit({ defaultMemberPermissions: null });
	}
	*/
	//convert to promise to be faster
	await Promise.all(
		cmds?.map(async (cmd) => {
			logger.trace("Removing defaultMemberPermissions from command", cmd.name);
			await cmd.edit({ defaultMemberPermissions: null });
		}) ?? []
	);
}

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

async function getTemplateFile(
	options: Djs.CommandInteractionOptionResolver,
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	const template = options.getAttachment(t("common.template"), true);
	if (process.env.NODE_ENV === "development" && process.env.PROXY_DISCORD_CDN)
		template.url = template.url.replace(
			"https://cdn.discordapp.com",
			process.env.PROXY_DISCORD_CDN
		);
	//fetch the template
	if (!template.contentType?.includes("json")) {
		await reply(interaction, {
			embeds: [embedError(ul("error.template.json"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const res = await fetch(template.url).then((res) => res.json());
	return verifyTemplateValue(res);
}

async function registerTemplate(
	options: Djs.CommandInteractionOptionResolver,
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	client: EClient
) {
	const allowedChannelType = [
		Djs.ChannelType.PublicThread,
		Djs.ChannelType.GuildText,
		Djs.ChannelType.PrivateThread,
	];
	const charactersAllowedChannelType = [
		Djs.ChannelType.PublicThread,
		Djs.ChannelType.GuildText,
		Djs.ChannelType.PrivateThread,
		Djs.ChannelType.GuildForum,
	];
	const templateData = await getTemplateFile(options, interaction, ul);
	if (!templateData) throw new BotError(ul("error.template.invalid"), botErrorOptions);

	const guildId = interaction.guild!.id;
	const channel = options.getChannel(t("common.channel"), true, allowedChannelType) as
		| Djs.AnyThreadChannel
		| Djs.TextChannel;

	let publicChannel = options.getChannel(
		t("register.options.public.name"),
		false,
		charactersAllowedChannelType
	);
	const privateChannel = options.getChannel(
		t("register.options.private.name"),
		false,
		charactersAllowedChannelType
	);
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
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (!publicChannel) {
		await reply(interaction, {
			embeds: [
				embedError(ul("error.public", { chan: Djs.channelMention(channel.id) }), ul),
			],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const msg = await createEmbed(ul, templateData, channel);
	await updateMemory(
		guildId,
		client,
		templateData,
		interaction,
		{
			channel: channel.id,
			privateChannel: privateChannel?.id,
			publicChannel: publicChannel.id,
		},
		msg
	);
	await reply(interaction, {
		content: ul("register.embed.registered"),
		files: downloadTutorialImages(),
	});
	await userDataUpdate(client, interaction, ul, templateData, options);
	await reply(interaction, {
		content: ul("register.embed.updated", { msg }),
	});
	await removeRestriction(guildId, client);
}

async function userDataUpdate(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	templateData: StatisticalTemplate,
	options: Djs.CommandInteractionOptionResolver
) {
	if (options.getBoolean(t("register.options.update.name")))
		await bulkEditTemplateUser(client, interaction, ul, templateData);
	else if (options.getBoolean(t("register.options.delete.name")))
		await bulkDeleteCharacters(client, interaction, ul);
}

async function createEmbed(
	ul: Translation,
	templateData: StatisticalTemplate,
	channel: Djs.AnyThreadChannel | Djs.TextChannel
) {
	const button = new Djs.ButtonBuilder()
		.setCustomId("register")
		.setLabel(ul("register.button"))
		.setStyle(Djs.ButtonStyle.Primary);
	const components =
		new Djs.ActionRowBuilder<Djs.MessageActionRowComponentBuilder>().addComponents(
			button
		);
	let embedTemplate = new Djs.EmbedBuilder()
		.setTitle(ul("embed.template"))
		.setDescription(ul("register.embed.description"))
		.setThumbnail(
			"https://github.com/dicelette/discord-dicelette/blob/main/assets/template.png?raw=true"
		)
		.setColor("Random");
	let statisticsEmbed: undefined | Djs.EmbedBuilder;
	if (templateData.statistics) {
		statisticsEmbed = new Djs.EmbedBuilder()
			.setTitle(ul("common.statistics").capitalize())
			.setThumbnail(
				"https://github.com/dicelette/discord-dicelette/blob/main/assets/player.png?raw=true"
			);
		for (const [stat, value] of Object.entries(templateData.statistics)) {
			const { min, max, combinaison, exclude } = value;
			let msg = "";
			if (combinaison) msg += `- Combinaison${ul("common.space")}: \`${combinaison}\`\n`;
			if (min !== undefined) msg += `- Min${ul("common.space")}: \`${min}\`\n`;
			if (max) msg += `- Max${ul("common.space")}: \`${max}\`\n`;
			msg += `- __${ul("register.embed.exclude")}__${ul("common.space")}: ${exclude ? ul("common.yes") : ul("common.no")}\n`;
			if (msg.length === 0) msg = ul("register.embed.noValue");
			statisticsEmbed.addFields({
				inline: true,
				name: stat.capitalize(),
				value: msg,
			});
		}
	}
	if (templateData.diceType && templateData.diceType.trim().length > 0)
		embedTemplate.addFields({
			name: ul("common.dice").capitalize(),
			value: `\`${capitalizeBetweenPunct(templateData.diceType)}\``,
		});
	if (templateData.critical) {
		let msgComparator = "";
		if (templateData.critical?.success)
			msgComparator += `- ${ul("roll.critical.success")}${ul("common.space")}: \`${templateData.critical.success}\`\n`;
		if (templateData.critical?.failure)
			msgComparator += `- ${ul("roll.critical.failure")}${ul("common.space")}: \`${templateData.critical.failure}\`\n`;
		if (msgComparator.length > 0)
			embedTemplate.addFields({
				name: ul("register.embed.comparator"),
				value: msgComparator,
			});
	}
	if (templateData.customCritical)
		embedTemplate = createCustomCritical(embedTemplate, templateData.customCritical);
	if (templateData.total) {
		embedTemplate.addFields({
			inline: true,
			name: ul("common.total"),
			value: `\`${templateData.total}\``,
		});
		embedTemplate.addFields({
			inline: true,
			name: ul("register.embed.forceDistrib"),
			value: `\`${templateData.forceDistrib ? ul("common.yes") : ul("common.no")}\``,
		});
	}
	let diceEmbed: undefined | Djs.EmbedBuilder;
	if (templateData.damage) {
		diceEmbed = new Djs.EmbedBuilder()
			.setTitle(ul("embed.dice"))
			.setThumbnail(
				"https://raw.githubusercontent.com/dicelette/discord-dicelette/main/assets/dice.png"
			);
		for (const [dice, value] of Object.entries(templateData.damage))
			diceEmbed.addFields({
				inline: true,
				name: dice.capitalize(),
				value: value.trim().length > 0 ? `\`${value}\`` : "_ _",
			});
	}
	const embeds = [embedTemplate, statisticsEmbed, diceEmbed].filter(
		(embed) => embed !== undefined
	);
	const msg = await channel.send({
		components: [components],
		content: "",
		embeds: embeds as Djs.EmbedBuilder[],
		files: [
			{
				attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"),
				name: "template.json",
			},
		],
	});
	await msg.pin();
	return msg;
}

async function updateMemory(
	guildId: string,
	client: EClient,
	templateData: StatisticalTemplate,
	interaction: Djs.ChatInputCommandInteraction,
	channels: {
		channel: string;
		publicChannel: string;
		privateChannel?: string;
	},
	msg: Djs.Message
) {
	const { channel, publicChannel, privateChannel } = channels;
	client.template.set(guildId, templateData);
	//save in database file
	const json = client.settings.get(guildId);
	const statsName = templateData.statistics
		? Object.keys(templateData.statistics)
		: undefined;
	const excludedStats = templateData.statistics
		? Object.keys(
				Object.fromEntries(
					Object.entries(templateData.statistics).filter(([_, value]) => value.exclude)
				)
			)
		: undefined;
	const damageName = templateData.damage ? Object.keys(templateData.damage) : undefined;
	if (json) {
		await deleteOldTemplate(json, interaction);
		json.templateID = {
			channelId: channel,
			damageName: damageName ?? [],
			excludedStats: excludedStats ?? [],
			messageId: msg.id,
			statsName: statsName ?? [],
			valid: true,
		};
		json.managerId = publicChannel;

		if (privateChannel) json.privateChannel = privateChannel;
		client.settings.set(guildId, json);
	} else {
		const newData: GuildData = {
			lang: interaction.guild?.preferredLocale ?? interaction.locale,
			managerId: undefined,
			templateID: {
				channelId: channel,
				damageName: damageName ?? [],
				excludedStats: excludedStats ?? [],
				messageId: msg.id,
				statsName: statsName ?? [],
				valid: true,
			},
			user: {},
		};
		client.settings.set(guildId, newData);
	}
}

async function updateTemplateFile(
	options: Djs.CommandInteractionOptionResolver,
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	client: EClient
) {
	const templateData = await getTemplateFile(options, interaction, ul);
	if (!templateData) throw new BotError(ul("error.template.invalid"), botErrorOptions);

	const guildId = interaction.guild!.id;
	const oldData = client.settings.get(guildId);
	if (!oldData) {
		logger.warn(`No old template data found for guild ${guildId}`);
		await reply(interaction, {
			embeds: [embedError(ul("error.template.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const templateId = oldData.templateID;
	const channelId = templateId.channelId;
	const publicChannelId = oldData.managerId;
	if (!publicChannelId) {
		logger.warn(`No public channel found for guild ${guildId}`);
		await reply(interaction, {
			embeds: [embedError(ul("error.template.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const privateChannelId = oldData.privateChannel;
	//get the channels in the guild
	const channel = (await fetchChannel(interaction.guild!, channelId)) as
		| Djs.AnyThreadChannel
		| Djs.TextChannel;
	if (!channel) {
		logger.warn(`Channel ${channelId} not found in guild ${guildId}`);
		await reply(interaction, {
			embeds: [embedError(ul("error.template.notFound"), ul)],
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const msg = await createEmbed(ul, templateData, channel);
	await updateMemory(
		guildId,
		client,
		templateData,
		interaction,
		{
			channel: channel.id,
			privateChannel: privateChannelId,
			publicChannel: publicChannelId,
		},
		msg
	);
	await userDataUpdate(client, interaction, ul, templateData, options);
	await reply(interaction, {
		content: ul("register.embed.updated", { msg }),
	});
	await removeRestriction(guildId, client);
}

async function deleteOldTemplate(
	json: GuildData,
	interaction: Djs.ChatInputCommandInteraction
) {
	if (json?.templateID?.messageId && json?.templateID?.channelId) {
		try {
			const channel = await fetchChannel(interaction.guild!, json.templateID.channelId);
			const msg = await (channel as Djs.TextChannel).messages.fetch(
				json.templateID.messageId
			);
			await msg.delete();
		} catch (e) {
			logger.warn(e, "registerTemplate: delete message");
		}
	}
}
