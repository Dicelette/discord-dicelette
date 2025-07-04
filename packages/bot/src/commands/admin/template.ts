import { verifyTemplateValue } from "@dicelette/core";
import { t } from "@dicelette/localization";
import { type GuildData, TUTORIAL_IMAGES } from "@dicelette/types";
import { capitalizeBetweenPunct, logger } from "@dicelette/utils";
import type { EClient } from "client";
import * as Djs from "discord.js";
import {
	bulkDeleteCharacters,
	bulkEditTemplateUser,
	createCustomCritical,
	createDefaultThread,
	embedError,
	interactionError,
	reply,
} from "messages";
import { fetchChannel, getLangAndConfig } from "utils";
import { DB_CMD_NAME } from "../index";
import "discord_ext";

export const registerTemplate = {
	data: new Djs.SlashCommandBuilder()
		.setNames("register.name")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
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
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		if (!interaction.guild) return;
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const { ul } = getLangAndConfig(client, interaction);
		const template = options.getAttachment(t("common.template"), true);
		//fetch the template
		if (!template.contentType?.includes("json")) {
			await reply(interaction, {
				embeds: [embedError(ul("error.template.json"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const allowedChannelType = [
			Djs.ChannelType.PublicThread,
			Djs.ChannelType.GuildText,
			Djs.ChannelType.PrivateThread,
		];
		const res = await fetch(template.url).then((res) => res.json());
		try {
			const templateData = verifyTemplateValue(res);
			const guildId = interaction.guild.id;
			const channel = options.getChannel(t("common.channel"), true, allowedChannelType) as
				| Djs.AnyThreadChannel
				| Djs.TextChannel;

			let publicChannel = options.getChannel(t("register.options.public.name"), false);
			const privateChannel = options.getChannel(
				t("register.options.private.name"),
				false
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

			//if there are ~25 stats we need to create an embed for it, so go to multiple embed, as user was done.
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
					if (combinaison)
						msg += `- Combinaison${ul("common.space")}: \`${combinaison}\`\n`;
					if (min) msg += `- Min${ul("common.space")}: \`${min}\`\n`;
					if (max) msg += `- Max${ul("common.space")}: \`${max}\`\n`;
					msg += `- __${ul("register.embed.exclude")}__${ul("common.space")}: ${exclude ? ul("common.yes") : ul("common.no")}\n`;
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
					name: ul("common.total"),
					value: `\`${templateData.total}\``,
					inline: true,
				});
				embedTemplate.addFields({
					name: ul("register.embed.forceDistrib"),
					value: `\`${templateData.forceDistrib ? ul("common.yes") : ul("common.no")}\``,
					inline: true,
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
			//register in the cache
			client.template.set(guildId, templateData);
			//save in database file
			const json = client.settings.get(guildId);
			const statsName = templateData.statistics
				? Object.keys(templateData.statistics)
				: undefined;
			const excludedStats = templateData.statistics
				? Object.keys(
						Object.fromEntries(
							Object.entries(templateData.statistics).filter(
								([_, value]) => value.exclude
							)
						)
					)
				: undefined;
			const damageName = templateData.damage
				? Object.keys(templateData.damage)
				: undefined;
			if (json) {
				if (json?.templateID?.messageId && json.templateID?.channelId) {
					try {
						const channel = await fetchChannel(
							interaction.guild,
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
					excludedStats: excludedStats ?? [],
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
						excludedStats: excludedStats ?? [],
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
				await bulkEditTemplateUser(client, interaction, ul, templateData);
			else if (options.getBoolean(t("register.options.delete.name")))
				await bulkDeleteCharacters(client, interaction, ul);
			await removeRestriction(interaction.guild.id, client);
		} catch (e) {
			logger.fatal(e, "registerTemplate: error while registering template");
			const langToUse = getLangAndConfig(client, interaction).langToUse;
			await interactionError(client, interaction, e as Error, ul, langToUse);
			return;
		}
	},
};

async function removeRestriction(guildId: string, client: EClient): Promise<void> {
	const guildCommmands = await client.application?.commands.fetch({ guildId });
	const cmds = guildCommmands?.filter((cmd) => DB_CMD_NAME.includes(cmd.name));
	for (const cmd of cmds?.values() ?? []) {
		await cmd.edit({ defaultMemberPermissions: null });
	}
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
