// noinspection SuspiciousTypeOfGuard

import { LocalePrimary, cmdLn, ln, t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { localeList } from "locales";
import { reply } from "messages";

const findLocale = (locale?: Djs.Locale) => {
	if (locale === Djs.Locale.EnglishUS || locale === Djs.Locale.EnglishGB)
		return "English";
	if (!locale) return undefined;
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === locale || abbr === locale;
	});
	const name = localeName?.[0];
	if (name) return LocalePrimary[name as keyof typeof LocalePrimary];
	return undefined;
};

export const configuration = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("config.name"))
		.setNameLocalizations(cmdLn("config.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescription(t("config.description"))
		.setDescriptionLocalizations(cmdLn("config.description"))
		/* CHANGE LANG*/
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("config.lang.name"))
				.setNameLocalizations(cmdLn("config.lang.name"))
				.setDescription(t("config.lang.description"))
				.setDescriptionLocalizations(cmdLn("config.lang.description"))
				.addStringOption((option) =>
					option
						.setName(t("config.lang.options.name"))
						.setNameLocalizations(cmdLn("config.lang.options.name"))
						.setDescription(t("config.lang.options.desc"))
						.setDescriptionLocalizations(cmdLn("config.lang.options.desc"))
						.setRequired(true)
						.addChoices(...localeList)
				)
		)

		/* LOGS */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("logs.name"))
				.setNameLocalizations(cmdLn("logs.name"))
				.setDescription(t("logs.description"))
				.setDescriptionLocalizations(cmdLn("logs.description"))
				.setNameLocalizations(cmdLn("logs.name"))
				.addChannelOption((option) =>
					option
						.setName(t("common.channel"))
						.setDescription(t("logs.options"))
						.setDescriptionLocalizations(cmdLn("logs.options"))
						.setNameLocalizations(cmdLn("common.channel"))
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
				.setName(t("changeThread.name"))
				.setNameLocalizations(cmdLn("changeThread.name"))
				.setDescription(t("changeThread.description"))
				.setDescriptionLocalizations(cmdLn("changeThread.description"))
				.addChannelOption((option) =>
					option
						.setName(t("common.channel"))
						.setNameLocalizations(cmdLn("common.channel"))
						.setDescription(t("changeThread.options"))
						.setDescriptionLocalizations(cmdLn("changeThread.options"))
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
				.setName(t("timer.name"))
				.setNameLocalizations(cmdLn("timer.name"))
				.setDescription(t("timer.description"))
				.setDescriptionLocalizations(cmdLn("timer.description"))
				.addNumberOption((option) =>
					option
						.setName(t("timer.option.name"))
						.setNameLocalizations(cmdLn("timer.option.name"))
						.setDescription(t("timer.option.description"))
						.setDescriptionLocalizations(cmdLn("timer.option.description"))
						.setRequired(true)
						.setMinValue(0)
						.setMaxValue(3600)
				)
		)

		/* DISABLE THREAD */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("disableThread.name"))
				.setNameLocalizations(cmdLn("disableThread.name"))
				.setDescription(t("disableThread.description"))
				.setDescriptionLocalizations(cmdLn("disableThread.description"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescription(t("disableThread.options.desc"))
						.setDescriptionLocalizations(cmdLn("disableThread.options.desc"))
						.setRequired(true)
				)
		)

		/* DISPLAY */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("config.display.name"))
				.setNameLocalizations(cmdLn("config.display.name"))
				.setDescription(t("config.display.description"))
				.setDescriptionLocalizations(cmdLn("config.display.description"))
		)
		/* AUTO ROLE */
		.addSubcommandGroup((group) =>
			group
				.setName(t("autoRole.name"))
				.setNameLocalizations(cmdLn("autoRole.name"))
				.setDescription(t("autoRole.description"))
				.setDescriptionLocalizations(cmdLn("autoRole.description"))
				.addSubcommand((subcommand) =>
					subcommand
						.setName(t("common.statistics"))
						.setNameLocalizations(cmdLn("common.statistics"))
						.setDescription(t("autoRole.stat.desc"))
						.setDescriptionLocalizations(cmdLn("autoRole.stat.desc"))
						.addRoleOption((option) =>
							option
								.setName(t("common.role"))
								.setNameLocalizations(cmdLn("common.role"))
								.setDescription(t("autoRole.options"))
								.setDescriptionLocalizations(cmdLn("autoRole.options"))
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName(t("common.dice"))
						.setNameLocalizations(cmdLn("common.dice"))
						.setDescription(t("autoRole.dice.desc"))
						.setDescriptionLocalizations(cmdLn("autoRole.dice.desc"))
						.addRoleOption((option) =>
							option
								.setName(t("common.role"))
								.setNameLocalizations(cmdLn("common.role"))
								.setDescription(t("autoRole.options"))
								.setDescriptionLocalizations(cmdLn("autoRole.options"))
								.setRequired(false)
						)
				)
		)

		/* TIMESTAMP */
		.addSubcommand((sub) =>
			sub
				.setName(t("timestamp.name"))
				.setDescription(t("timestamp.description"))
				.setDescriptionLocalizations(cmdLn("timestamp.description"))
				.setNameLocalizations(cmdLn("timestamp.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("timestamp.options"))
						.setRequired(true)
				)
		)
		/* ANCHOR */
		.addSubcommand((sub) =>
			sub
				.setName(t("anchor.name"))
				.setDescription(t("anchor.description"))
				.setDescriptionLocalizations(cmdLn("anchor.description"))
				.setNameLocalizations(cmdLn("anchor.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("anchor.options"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescriptionLocalizations(cmdLn("anchor.options"))
						.setRequired(true)
				)
		)
		/**
		 * LOGS IN DICE RESULT
		 * For the result interaction, not the logs
		 */
		.addSubcommand((sub) =>
			sub
				.setName(t("config.logLink.name"))
				.setDescription(t("config.logLink.description"))
				.setDescriptionLocalizations(cmdLn("config.logLink.description"))
				.setNameLocalizations(cmdLn("config.logLink.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("linkToLog.options"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescriptionLocalizations(cmdLn("linkToLog.options"))
						.setRequired(true)
				)
		)
		/** HIDDEN ROLL FOR MJROLL */
		.addSubcommand((sub) =>
			sub
				.setName(t("hidden.title"))
				.setDescriptionLocalizations(cmdLn("hidden.description"))
				.setDescription(t("hidden.description"))
				.setNameLocalizations(cmdLn("hidden.title"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("linkToLog.options"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescriptionLocalizations(cmdLn("linkToLog.options"))
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName(t("common.channel"))
						.setNameLocalizations(cmdLn("common.channel"))
						.setDescription(t("hidden.options"))
						.setDescriptionLocalizations(cmdLn("hidden.options"))
						.setRequired(false)
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread
						)
				)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const lang =
			client.settings.get(interaction.guild.id, "lang") ??
			interaction.guild.preferredLocale;
		const ul = ln(lang);
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const subcommandGroup = options.getSubcommandGroup();
		if (subcommandGroup && subcommandGroup === t("autoRole.name")) {
			if (subcommand === t("common.statistics"))
				return stats(options, client, ul, interaction);
			if (subcommand === t("common.dice")) return dice(options, client, ul, interaction);
		}
		switch (subcommand) {
			case t("logs.name"):
				return await logs(interaction, client, ul, options);
			case t("changeThread.name"):
				return await changeThread(interaction, client, ul, options);
			case t("disableThread.name"):
				return await disableThread(interaction, client, ul, options);
			case t("timer.name"):
				return await timer(interaction, client, ul, options);
			case t("config.display.name"):
				return await display(interaction, client, ul);
			case t("timestamp.name"):
				return await timestamp(interaction, client, ul, options);
			case t("anchor.name"):
				return await anchor(interaction, client, ul);
			case t("config.logLink.name"):
				return await linkToLog(interaction, client, ul);
			case t("hidden.title"):
				return await hiddenRoll(interaction, client, ul, options);
			case t("config.lang.name"):
				return changeLanguage(options, client, interaction);
		}
	},
};

function changeLanguage(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	interaction: Djs.CommandInteraction
) {
	const lang = options.getString(t("config.lang.options.name"), true) as Djs.Locale;
	client.settings.set(interaction.guild!.id, lang, "lang");
	const ul = ln(lang);
	const nameOfLang = findLocale(lang);
	return reply(interaction, {
		content: ul("config.lang.set", { lang: nameOfLang }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

function stats(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: Djs.CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.stats");
		return reply(interaction, {
			content: ul("autoRole.stat.remove"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.stats");
	return reply(interaction, {
		content: ul("autoRole.stat.set", { role: Djs.roleMention(role.id) }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

function dice(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: Djs.CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.dice");
		return reply(interaction, {
			content: ul("autoRole.dice.remove"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.dice");
	return reply(interaction, {
		content: ul("autoRole.dice.set", { role: Djs.roleMention(role.id) }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function logs(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const channel = options.getChannel(ul("common.channel"), true);
	// noinspection SuspiciousTypeOfGuard
	if (
		!channel ||
		(!(channel instanceof Djs.TextChannel) && !(channel instanceof Djs.ThreadChannel))
	) {
		const oldChan = client.settings.get(interaction.guild!.id, "logs");
		client.settings.delete(interaction.guild!.id, "logs");
		const msg = oldChan
			? ` ${ul("logs.inChan", { chan: Djs.channelMention(oldChan) })}`
			: ".";
		await reply(interaction, {
			content: `${ul("logs.delete")}${msg}`,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "logs");
	await reply(interaction, {
		content: ul("logs.set", { channel: channel.name }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function changeThread(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const channel = options.getChannel("channel");
	const oldChan = client.settings.get(interaction.guild!.id, "rollChannel");
	if (!channel && !oldChan) {
		await reply(interaction, {
			content: ul("changeThread.noChan"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (!interaction.guild) return;
	if (
		!channel ||
		(!(channel instanceof Djs.TextChannel) && !(channel instanceof Djs.ThreadChannel))
	) {
		const msg = oldChan
			? ` ${ul("logs.inChan", { chan: Djs.channelMention(oldChan) })}`
			: ".";
		client.settings.delete(interaction.guild.id, "rollChannel");
		await reply(interaction, {
			content: `${ul("changeThread.delete")}${msg}`,
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	client.settings.set(interaction.guild.id, channel.id, "rollChannel");
	await reply(
		interaction,
		ul("changeThread.set", { channel: Djs.channelMention(channel.id) })
	);
	return;
}

async function disableThread(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	//toggle TRUE = disable thread creation
	//toggle FALSE = enable thread creation
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	if (toggle) {
		client.settings.set(interaction.guild!.id, true, "disableThread");
		if (rollChannel) {
			const mention = `<#${rollChannel}>`;
			const msg =
				ul("disableThread.disable.reply") +
				ul(
					"disableThread.disable.mention",
					{ mention } + ul("disableThread.disable.autoDelete")
				);
			await reply(interaction, msg);
			return;
		}
		await reply(interaction, ul("disableThread.disable.reply"));
		return;
	}
	client.settings.delete(interaction.guild!.id, "disableThread");
	if (rollChannel) {
		const mention = `<#${rollChannel}>`;
		const msg =
			ul("disableThread.enable.reply") + ul("disableThread.enable.mention", { mention });
		await reply(interaction, msg);
		return;
	}
	await reply(interaction, ul("disableThread.enable.reply"));
	return;
}

async function hiddenRoll(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	const channel = options.getChannel(t("common.channel"), false);
	if (!toggle) {
		//disable
		client.settings.delete(interaction.guild!.id, "hiddenRoll");
		await reply(interaction, {
			content: ul("hidden.disabled"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	if (!channel) {
		client.settings.set(interaction.guild!.id, true, "hiddenRoll");
		await reply(interaction, {
			content: ul("hidden.enabled"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "hiddenRoll");
	await reply(interaction, {
		content: ul("hidden.enabledChan", { channel: Djs.channelMention(channel.id) }),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}

async function timer(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	const timer = options.getNumber(t("timer.option.name"), true);
	client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
	if (timer === 0) {
		await interaction.reply({ content: ul("timer.delete", { timer }) });
	} else {
		await interaction.reply({ content: ul("timer.success", { timer }) });
	}
}

async function display(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation
) {
	const guildSettings = client.settings.get(interaction.guild!.id);
	if (!guildSettings) return;

	const dpTitle = (content: string, toUpperCase?: boolean) => {
		if (toUpperCase)
			return `- **__${ul(content)?.capitalize()}__**${ul("common.space")}:`;
		return `- **__${ul(content)}__**${ul("common.space")}:`;
	};

	const dp = (settings?: string | boolean | number, type?: "role" | "chan" | "timer") => {
		if (!settings && type === "timer") return "`180`s (`3`min)";
		if (!settings) return ul("common.no");
		if (typeof settings === "boolean") return ul("common.yes");
		if (typeof settings === "number") {
			if (settings === 0 || guildSettings?.disableThread) return ul("common.no");
			return `\`${settings / 1000}\`s (\`${settings / 60000}\`min)`;
		}
		if (type === "role") return `<@&${settings}>`;
		return `<#${settings}>`;
	};

	const userLocale =
		findLocale(guildSettings.lang) ??
		findLocale(interaction.guild!.preferredLocale) ??
		"English";
	const baseEmbed = new Djs.EmbedBuilder()
		.setTitle(ul("config.title", { guild: interaction.guild!.name }))
		.setThumbnail(interaction.guild!.iconURL() ?? "")
		.setColor("Random")
		.addFields(
			{
				name: ul("config.lang.options.name").capitalize(),
				value: userLocale.capitalize(),
				inline: true,
			},
			{
				name: ul("config.logs"),
				value: dedent(`
				${dpTitle("config.admin.title")} ${dp(guildSettings.logs, "chan")}
				 ${ul("config.admin.desc")}
				${dpTitle("config.result.title")} ${dp(guildSettings.rollChannel, "chan")}
				 ${ul("config.result.desc")}
				${dpTitle("config.disableThread.title")} ${dp(guildSettings.disableThread)}
				 ${ul("config.disableThread.desc")}
				${dpTitle("config.hiddenRoll.title")} ${dp(guildSettings.hiddenRoll, "chan")}
				 ${ul("config.hiddenRoll.desc")}
			`),
			},
			{
				name: ul("config.sheet"),
				value: dedent(`
					${dpTitle("config.defaultSheet")} ${dp(guildSettings.managerId, "chan")}
					${dpTitle("config.privateChan")} ${dp(guildSettings.privateChannel, "chan")}
					`),
			},
			{
				name: ul("config.displayResult"),
				value: dedent(`
					${dpTitle("config.timestamp.title")} ${dp(guildSettings.timestamp)}
					 ${ul("config.timestamp.desc")}
					${dpTitle("config.timer.title")} ${dp(guildSettings.deleteAfter, "timer")}
					 ${ul("config.timer.desc")}
					${dpTitle("config.context.title")} ${dp(guildSettings.context)}
					 ${ul("config.context.desc")}
					${dpTitle("config.linkToLog.title")} ${dp(guildSettings.linkToLogs)}
					 ${ul("config.linkToLog.desc")}
					 `),
			},

			{
				name: ul("config.autoRole"),
				value: dedent(`
					${dpTitle("common.dice", true)} ${dp(guildSettings.autoRole?.dice, "role")}
					${dpTitle("common.statistics", true)} ${dp(guildSettings.autoRole?.stats, "role")}
				`),
			}
		);
	let templateEmbed: undefined | Djs.EmbedBuilder = undefined;
	if (guildSettings.templateID) {
		const templateID = guildSettings.templateID;
		const { channelId, messageId, statsName, damageName, excludedStats } =
			templateID ?? {};
		if (messageId && messageId.length > 0 && channelId && channelId.length > 0) {
			templateEmbed = new Djs.EmbedBuilder()
				.setTitle(ul("config.template"))
				.setColor("Random")
				.setThumbnail(
					"https://github.com/Dicelette/discord-dicelette/blob/main/assets/communication.png?raw=true"
				)
				.addFields({
					name: ul("config.templateMessage"),
					value: `https://discord.com/channels/${interaction.guild!.id}/${channelId}/${messageId}`,
				});
			const excluded =
				excludedStats?.length > 0 ? excludedStats.join("\n- ") : ul("common.no");
			const filteredStats = statsName?.filter((stat) => !excludedStats?.includes(stat));
			if (statsName && statsName.length > 0) {
				templateEmbed.addFields({
					name: ul("config.statsName"),
					value: `- ${filteredStats.join("\n- ")}`,
				});
			}
			if (excludedStats && excludedStats.length > 0) {
				templateEmbed.addFields({
					name: ul("config.excludedStats"),
					value: `- ${excluded}`,
				});
			}
			if (damageName && damageName.length > 0) {
				templateEmbed.addFields({
					name: ul("config.damageName"),
					value: `- ${damageName.map((value) => capitalizeBetweenPunct(value)).join("\n- ")}`,
				});
			}
		}
	}
	const embeds = [baseEmbed];
	if (templateEmbed) embeds.push(templateEmbed);
	await interaction.reply({ embeds });
}

async function timestamp(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "timestamp");
	if (toggle) {
		await reply(interaction, {
			content: ul("timestamp.enabled"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	} else {
		await reply(interaction, {
			content: ul("timestamp.disabled"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
}

async function anchor(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "context");
	const deleteLogs = client.settings.get(interaction.guild!.id, "deleteAfter") === 0;
	if (toggle) {
		if (deleteLogs)
			return await reply(interaction, {
				content: ul("anchor.enabled.noDelete"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		return await reply(interaction, {
			content: ul("anchor.enabled.logs"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
	return await reply(interaction, {
		content: ul("context.disabled"),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function linkToLog(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "linkToLogs");
	if (toggle) {
		return await reply(interaction, {
			content: ul("linkToLog.enabled"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
	return await reply(interaction, {
		content: ul("linkToLog.disabled"),
		flags: Djs.MessageFlags.Ephemeral,
	});
}
