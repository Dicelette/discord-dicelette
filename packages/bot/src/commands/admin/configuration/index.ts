import { t } from "@dicelette/localization";
import type { EClient } from "client";
import * as Djs from "discord.js";
import { localeList } from "locales";
import { getLangAndConfig } from "utils";
import { dice, stats } from "./auto_role";
import { changeLanguage } from "./change_language";
import { display, displayTemplate } from "./display";
import { hiddenRoll, resultChannel, setErrorLogs } from "./logs";
import { deleteAfter, linkToLog, setContextLink, timestamp } from "./results";
import { allowSelfRegistration } from "./self_registration";
import { stripOOC } from "./strip_ooc";
import "discord_ext";
import { editMeCommand } from "./editMe";

export const configuration = {
	data: new Djs.SlashCommandBuilder()
		.setNames("config.name")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescriptions("config.description")
		/* CHANGE LANG*/
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("config.lang.name")
				.setDescriptions("config.lang.description")
				.addStringOption((option) =>
					option
						.setNames("config.lang.options.name")
						.setDescriptions("config.lang.options.desc")
						.setRequired(true)
						.addChoices(...localeList)
				)
		)

		/* LOGS */
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("logs.name")
				.setDescriptions("logs.description")
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("logs.options")
						.setRequired(false)
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PrivateThread,
							Djs.ChannelType.PublicThread
						)
				)
		)
		/* RESULT CHANNEL */
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("changeThread.name")
				.setDescriptions("changeThread.description")

				.addBooleanOption((option) =>
					option
						.setNames("disableThread.name")
						.setDescriptions("disableThread.description")
						.setRequired(false)
				)
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescription("changeThread.options")
						.setRequired(false)
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread
						)
				)
		)

		/* DELETE AFTER */
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("timer.name")
				.setDescriptions("timer.description")
				.addNumberOption((option) =>
					option
						.setNames("timer.option.name")
						.setDescriptions("timer.option.description")
						.setRequired(true)
						.setMinValue(0)
						.setMaxValue(3600)
				)
		)

		/* DISPLAY */
		.addSubcommandGroup((group) =>
			group
				.setNames("display.title")
				.setDescriptions("config.display.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("config.display.general.name")
						.setDescriptions("config.display.general.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("common.template")
						.setDescriptions("config.display.template.description")
				)
		)
		/* AUTO ROLE */
		.addSubcommandGroup((group) =>
			group
				.setNames("autoRole.name")
				.setDescriptions("autoRole.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("common.statistics")
						.setDescriptions("autoRole.stat.desc")
						.addRoleOption((option) =>
							option
								.setNames("common.role")
								.setDescriptions("autoRole.options")
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("common.dice")
						.setDescriptions("autoRole.dice.desc")
						.addRoleOption((option) =>
							option
								.setNames("common.role")
								.setDescriptions("autoRole.options")
								.setRequired(false)
						)
				)
		)

		/* TIMESTAMP */
		.addSubcommand((sub) =>
			sub
				.setNames("timestamp.name")
				.setDescriptions("timestamp.description")
				.addBooleanOption((option) =>
					option
						.setNames("disableThread.options.name")
						.setDescriptions("timestamp.options")
						.setRequired(true)
				)
		)
		/* ANCHOR */
		.addSubcommand((sub) =>
			sub
				.setNames("anchor.name")
				.setDescriptions("anchor.description")
				.addBooleanOption((option) =>
					option
						.setNames("disableThread.options.name")
						.setDescriptions("anchor.options")
						.setRequired(true)
				)
		)
		/**
		 * LOGS IN DICE RESULT
		 * For the result interaction, not the logs
		 */
		.addSubcommand((sub) =>
			sub
				.setNames("config.logLink.name")
				.setDescriptions("config.logLink.description")
				.addBooleanOption((option) =>
					option
						.setNames("disableThread.options.name")
						.setDescriptions("linkToLog.options")
						.setRequired(true)
				)
		)
		/** HIDDEN ROLL FOR MJROLL */
		.addSubcommand((sub) =>
			sub
				.setNames("hidden.title")
				.setDescriptions("hidden.description")
				.addBooleanOption((option) =>
					option
						.setNames("disableThread.options.name")
						.setDescriptions("linkToLog.options")
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("hidden.options")
						.setRequired(false)
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread
						)
				)
		)
		/** SELF REGISTRATION */
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("config.selfRegister.name")
				.setDescriptions("config.selfRegister.description")
				.addBooleanOption((option) =>
					option
						.setNames("disableThread.options.name")
						.setDescriptions("linkToLog.options")
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setNames("config.selfRegister.moderation.name")
						.setDescriptions("config.selfRegister.moderation.desc")
						.setRequired(false)
				)
				.addBooleanOption((option) =>
					option
						.setNames("config.selfRegister.channel.name")
						.setDescriptions("config.selfRegister.channel.desc")
						.setRequired(false)
				)
		)
		/**
		 * Strip OOC
		 * @example /config strip_ooc prefix suffix timer channel
		 * @example /config strip_ooc regex timer channel
		 * @example /config strip_ooc prefix suffix timer (will only delete)
		 */
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("config.stripOOC.name")
				.setDescriptions("config.stripOOC.description")
				.addStringOption((option) =>
					option
						.setNames("config.stripOOC.prefix.name")
						.setDescriptions("config.stripOOC.prefix.description")
				)
				.addStringOption((option) =>
					option
						.setNames("config.stripOOC.suffix.name")
						.setDescriptions("config.stripOOC.suffix.description")
				)
				.addStringOption((option) =>
					option
						.setNames("config.stripOOC.regex.name")
						.setDescriptions("config.stripOOC.regex.description")
				)
				.addNumberOption((option) =>
					option
						.setNames("config.stripOOC.timer.name")
						.setDescriptions("config.stripOOC.timer.description")
						.setMinValue(0)
						.setMaxValue(3600)
				)
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("config.stripOOC.channel.description")
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread
						)
				)
				.addBooleanOption((option) =>
					option
						.setNames("config.stripOOC.thread_mode.name")
						.setDescriptions("config.stripOOC.thread_mode.description")
				)
		)
		/**
		 * EditMe : Change the bot avatar, name, bio, banner
		 * @param interaction
		 * @param client
		 */
		.addSubcommand((sub) =>
			sub
				.setNames("editMe.name")
				.setDescriptions("editMe.description")
				.addStringOption((option) =>
					option
						.setNames("editMe.nick.name")
						.setDescriptions("editMe.nick.description")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("editMe.bio.name")
						.setDescriptions("editMe.bio.description")
						.setRequired(false)
				)
				.addAttachmentOption((att) =>
					att
						.setNames("editMe.asset.name")
						.setDescriptions("editMe.asset.description")
						.setRequired(false)
				)
				.addAttachmentOption((att) =>
					att
						.setNames("editMe.banner.name")
						.setDescriptions("editMe.banner.description")
						.setRequired(false)
				)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const { ul } = getLangAndConfig(client, interaction);
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const subcommandGroup = options.getSubcommandGroup();
		if (subcommandGroup)
			switch (subcommandGroup) {
				case t("display.title"):
					switch (subcommand) {
						case t("config.display.general.name"):
							return await display(interaction, client, ul);
						case t("common.template"):
							return await displayTemplate(interaction, client, ul);
					}
					break;
				case t("autoRole.name"):
					switch (subcommand) {
						case t("common.statistics"):
							return stats(options, client, ul, interaction);
						case t("common.dice"):
							return dice(options, client, ul, interaction);
					}
					break;
			}
		switch (subcommand) {
			case t("logs.name"):
				return await setErrorLogs(interaction, client, ul, options);
			case t("changeThread.name"):
				return await resultChannel(interaction, client, ul, options);
			case t("timer.name"):
				return await deleteAfter(interaction, client, ul, options);
			case t("timestamp.name"):
				return await timestamp(interaction, client, ul, options);
			case t("anchor.name"):
				return await setContextLink(interaction, client, ul);
			case t("config.logLink.name"):
				return await linkToLog(interaction, client, ul);
			case t("hidden.title"):
				return await hiddenRoll(interaction, client, ul, options);
			case t("config.lang.name"):
				return changeLanguage(options, client, interaction);
			case t("config.selfRegister.name"):
				return await allowSelfRegistration(client, interaction, ul, options);
			case t("config.stripOOC.name"):
				return await stripOOC(options, client, interaction, ul);
			case t("editMe.name"):
				return await editMeCommand(interaction, ul);
		}
	},
};
