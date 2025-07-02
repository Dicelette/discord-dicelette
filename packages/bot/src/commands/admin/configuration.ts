import { LocalePrimary, ln, t } from "@dicelette/localization";
import type { StripOOC, Translation } from "@dicelette/types";
import { capitalizeBetweenPunct, logger } from "@dicelette/utils";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { localeList } from "locales";
import { reply } from "messages";
import { getLangAndConfig } from "utils";
import "discord_ext";

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
				.setDescription("timer.description")
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
				.setNames("config.display.name")
				.setDescriptions("config.display.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("config.display.general.name")
						.setDescriptions("config.display.general.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("config.display.template.name")
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
						.setNames("config.stripOOC.channel.name")
						.setDescriptions("config.stripOOC.channel.description")
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread
						)
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
				case t("config.display.name"):
					switch (subcommand) {
						case t("config.display.general.name"):
							return await display(interaction, client, ul);
						case t("config.display.template.name"):
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
		}
	},
};

async function stripOOC(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	const prefix = options.getString(t("config.stripOOC.prefix.name"), false);
	const suffix = options.getString(t("config.stripOOC.suffix.name"), false);
	let regex = options.getString(t("config.stripOOC.regex.name"), false);
	const timer = options.getNumber(t("config.stripOOC.timer.name"), false);
	const channel = options.getChannel(t("config.stripOOC.channel.name"), false);

	if ((!prefix && !suffix && !regex) || timer === 0) {
		//delete
		client.settings.delete(interaction.guild!.id, "stripOOC");
		await reply(interaction, {
			content: ul("config.stripOOC.delete"),
		});
		return;
	}
	if (!prefix && !suffix && !regex) {
		throw new Error(ul("config.stripOOC.error"));
	}
	if (regex) {
		//validate regex
		if (!regex.startsWith("^")) regex = `^${regex}`;
		if (!regex.endsWith("$")) regex = `${regex}$`;
		try {
			new RegExp(regex);
		} catch (e) {
			throw new Error(ul("config.stripOOC.regex.error", { e }));
		}
	}
	//construct regex based on prefix/suffix
	if (suffix && prefix && !regex) {
		regex = `^${escapeRegex(prefix)}(.*)${escapeRegex(suffix)}$`;
	}
	if (!regex) throw new Error(ul("config.stripOOC.error"));
	const row = new Djs.ActionRowBuilder<Djs.ChannelSelectMenuBuilder>().addComponents(
		new Djs.ChannelSelectMenuBuilder()
			.setCustomId("stripOoc_select")
			.setChannelTypes(
				Djs.ChannelType.GuildText,
				Djs.ChannelType.GuildCategory,
				Djs.ChannelType.PrivateThread,
				Djs.ChannelType.PublicThread
			)
			.setPlaceholder(ul("config.stripOOC.channel.placeholder"))
			.setMinValues(1)
			.setMaxValues(25)
	);
	const response = await interaction.reply({
		content: ul("config.stripOOC.select"),
		components: [row],
		withResponse: true,
	});
	try {
		const collectorFilter: (
			i: Djs.StringSelectMenuInteraction | Djs.ChannelSelectMenuInteraction
		) => boolean = (i) =>
			i.user.id === interaction.user.id && i.customId === "stripOoc_select";
		if (!response.resource?.message) {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(ul("error.failedReply"));
		}
		const selection = response.resource.message.createMessageComponentCollector({
			filter: collectorFilter,
			componentType: Djs.ComponentType.ChannelSelect,
			time: 60_000, // Timeout en ms
		});
		selection.on("collect", async (i) => {
			const values = i.values;

			if (values.length > 0) {
				const stripOOC: Partial<StripOOC> = {
					regex: regex,
					timer: timer ? timer * 1000 : 0,
					forwardId: channel?.id ?? undefined,
					categoryId: values,
				};
				client.settings.set(interaction.guildId!, stripOOC, "stripOOC");
				await interaction.editReply({
					components: [],
					content: ul("config.stripOOC.success", {
						regex: regex ?? ul("common.no"),
						timer: timer ? `${timer}s` : ul("common.no"),
						channel: channel ? Djs.channelMention(channel.id) : ul("common.no"),
						categories: values.map((v) => Djs.channelMention(v)).join("\n- "),
					}),
				});
			}
		});
		selection.on("end", async (collected, reason) => {
			if (reason === "time") {
				await interaction.editReply({
					content: ul("config.stripOOC.timeOut"),
					components: [],
				});
			} else if (collected.size === 0) {
				await interaction.editReply({
					content: ul("config.stripOOC.noSelection"),
					components: [],
				});
			}
		});
	} catch (e) {
		console.error("Error in stripOOC selection:", e);
		await interaction.editReply({
			content: ul("config.stripOOC.timeOut"),
			components: [],
		});
		return;
	}
}

function escapeRegex(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function changeLanguage(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	interaction: Djs.CommandInteraction
) {
	const lang = options.getString(t("config.lang.options.name"), true) as Djs.Locale;
	client.settings.set(interaction.guild!.id, lang, "lang");
	const ul = ln(lang);
	const nameOfLang = findLocale(lang);
	//update memory
	client.guildLocale.set(interaction.guild!.id, lang);
	return reply(interaction, {
		content: ul("config.lang.set", { lang: nameOfLang }),
	});
}

async function allowSelfRegistration(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	let toggle: boolean | string = options.getBoolean(
		t("disableThread.options.name"),
		true
	);
	const forceModeration = options.getBoolean(
		t("config.selfRegister.moderation.name"),
		false
	);
	const allowChannel = options.getBoolean(t("config.selfRegister.channel.name"), false);
	if (forceModeration) toggle = "moderation";
	if (allowChannel) toggle += "_channel";
	client.settings.set(interaction.guild!.id, toggle, "allowSelfRegister");
	if (!toggle) {
		return await reply(interaction, {
			content: ul("config.selfRegister.disable"),
		});
	}
	const template = client.settings.get(interaction.guild!.id, "templateID");
	const url =
		template?.channelId && template?.messageId
			? ` (https://discord.com/channels/${interaction.guild!.id}/${template?.channelId}/${template?.messageId})`
			: "";
	let msg = ul("config.selfRegister.enable", { url });
	if (toggle.toString().startsWith("moderation")) {
		logger.trace(
			`Self registration enabled with moderation for ${interaction.guild!.name}`
		);
		msg += `\n\n**__${ul("config.selfRegister.enableModeration")}__**`;
	}
	if (toggle.toString().endsWith("channel")) {
		logger.trace(
			`Self registration enabled with disallow channel for ${interaction.guild!.name}`
		);
		msg += `\n\n**__${ul("config.selfRegister.disableChannel")}__**`;
	}
	return await reply(interaction, {
		content: msg,
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
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.stats");
	return reply(interaction, {
		content: ul("autoRole.stat.set", { role: Djs.roleMention(role.id) }),
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
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.dice");
	return reply(interaction, {
		content: ul("autoRole.dice.set", { role: Djs.roleMention(role.id) }),
	});
}

async function setErrorLogs(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const channel = options.getChannel(ul("common.channel"), false);
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
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "logs");
	await reply(interaction, {
		content: ul("logs.set", { channel: channel.name }),
	});
}

async function resultChannel(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	await interaction.deferReply();
	const channel = options.getChannel(t("common.channel"));
	const oldChan = client.settings.get(interaction.guild!.id, "rollChannel");
	const disable = options.getBoolean(t("disableThread.name"));
	if (!channel && !oldChan && disable === null) {
		return await interaction.followUp({
			content: ul("changeThread.noChan"),
		});
	}
	if (disable === true) return await disableThread(interaction, client, ul, true);
	if (
		!channel ||
		(channel.type !== Djs.ChannelType.GuildText &&
			!(channel instanceof Djs.ThreadChannel))
	) {
		client.settings.delete(interaction.guild.id, "rollChannel");
		if (oldChan)
			await interaction.followUp({
				content: `${ul("changeThread.delete")} ${ul("logs.inChan", { chan: oldChan })}`,
			});
		if (disable === false) return await disableThread(interaction, client, ul, false);
		return await disableThread(interaction, client, ul, true);
	}
	client.settings.set(interaction.guild.id, channel.id, "rollChannel");
	await interaction.followUp(
		dedent(`
		- ${ul("changeThread.set", { channel: Djs.channelMention(channel.id) })}
		- ${ul("disableThread.enable.autoDelete")}
		`)
	);
	return await disableThread(interaction, client, ul, false, true);
}

async function disableThread(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	toggle: boolean,
	silent?: boolean
) {
	//toggle TRUE = disable thread creation
	//toggle FALSE = enable thread creation
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	if (toggle) {
		client.settings.set(interaction.guild!.id, true, "disableThread");
		if (rollChannel && !silent) {
			const mention = `<#${rollChannel}>`;
			const msg = `${ul("disableThread.disable.reply")}
			- ${ul("disableThread.disable.mention", { mention })}
			- ${ul("disableThread.disable.prefix")}
			- ${ul("disableThread.disable.autoDelete")}`;
			await interaction.followUp(dedent(msg));
			return;
		}
		if (!silent)
			await interaction.followUp(
				dedent(`${ul("disableThread.disable.reply")}
					- ${ul("disableThread.disable.prefix")}
					- ${ul("disableThread.disable.autoDelete")}`)
			);
		return;
	}
	client.settings.delete(interaction.guild!.id, "disableThread");
	if (rollChannel && !silent) {
		const mention = `<#${rollChannel}>`;
		const msg = `${ul("disableThread.enable.mention", { mention })}
		${ul("disableThread.enable.autoDelete")}`;
		await interaction.followUp(dedent(msg));
		return;
	}
	if (!silent)
		await interaction.followUp(
			dedent(`
		${ul("disableThread.enable.reply")}
	- ${ul("disableThread.enable.prefix")}
	- ${ul("disableThread.enable.autoDelete")}`)
		);
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
		});
		return;
	}
	if (!channel) {
		client.settings.set(interaction.guild!.id, true, "hiddenRoll");
		await reply(interaction, {
			content: ul("hidden.enabled"),
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "hiddenRoll");
	await reply(interaction, {
		content: ul("hidden.enabledChan", {
			channel: Djs.channelMention(channel.id),
		}),
	});
	return;
}

function formatDuration(seconds: number) {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes < 60)
		return remainingSeconds ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

async function deleteAfter(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	if (client.settings.get(interaction.guild.id, "disableThread"))
		return await reply(interaction, {
			content: ul("timer.error"),
		});

	const timer = options.getNumber(t("timer.option.name"), true);
	client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
	if (timer === 0) await interaction.reply({ content: ul("timer.delete", { timer }) });
	else
		await interaction.reply({
			content: ul("timer.success", { timer: formatDuration(timer) }),
		});
}

async function displayTemplate(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation
) {
	if (!interaction.guild) return;
	const guildSettings = client.settings.get(interaction.guild.id);

	let templateEmbed: undefined | Djs.EmbedBuilder;
	if (guildSettings?.templateID) {
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
			await interaction.reply({ embeds: [templateEmbed] });
		} else {
			await interaction.reply({
				content: ul("error.template.id"),
			});
		}
	} else {
		await interaction.reply({
			content: ul("config.noTemplate"),
		});
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

	const dp = (
		settings?: string | boolean | number,
		type?: "role" | "chan" | "time_delete" | "text" | "timer"
	) => {
		if (!settings && type === "time_delete") return "`180`s (`3`min)";
		if (!settings) return ul("common.no");
		if (typeof settings === "boolean") return ul("common.yes");
		if (typeof settings === "number" && type === "time_delete") {
			if (settings === 0 || guildSettings?.disableThread) return ul("common.no");
			return `\`${settings / 1000}s\` (\`${formatDuration(settings / 1000)}\`)`;
		}
		if (type === "role") return `<@&${settings}>`;
		if (type === "text") return `\`${settings}\``;
		if (type === "timer" && typeof settings === "number") {
			if (settings === 0) return ul("common.no");
			return `\`${settings / 1000}s\` (\`${formatDuration(settings / 1000)}\`)`;
		}
		return `<#${settings}>`;
	};

	const userLocale =
		findLocale(guildSettings.lang) ??
		findLocale(interaction.guild!.preferredLocale) ??
		"English";

	const catooc = guildSettings.stripOOC?.categoryId;
	let resOoc = ul("common.no");
	if (catooc && catooc.length > 0)
		resOoc = `\n  - ${catooc.map((c) => Djs.channelMention(c)).join("\n  - ")}`;

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
					${dpTitle("config.timer.title")} ${dp(guildSettings.deleteAfter, "time_delete")}
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
			},
			{
				name: ul("config.selfRegister.name").replace("_", " ").toTitle(),
				value: `${dp(guildSettings.allowSelfRegister)}`,
			},
			{
				name: ul("config.stripOOC.title"),
				value:
					`${dpTitle("config.stripOOC.regex.name", true)} ${dp(guildSettings.stripOOC?.regex, "text")}` +
					"\n" +
					`${dpTitle("config.stripOOC.timer.name", true)} ${dp(guildSettings.stripOOC?.timer, "timer")}` +
					"\n" +
					`${dpTitle("config.stripOOC.forward")} ${dp(guildSettings.stripOOC?.forwardId, "chan")}` +
					"\n" +
					`${dpTitle("config.stripOOC.categories")} ${resOoc}`,
			}
		);
	const embeds = [baseEmbed];
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
		});
	} else {
		await reply(interaction, {
			content: ul("timestamp.disabled"),
		});
	}
}

/**
 * Enables or disables the display of context links in dice roll results for the guild.
 *
 * Updates the guild's settings to show or hide context links and replies with a localized confirmation message based on the new setting and the current message deletion timer.
 */
async function setContextLink(
	interaction: Djs.ChatInputCommandInteraction,
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
			});
		return await reply(interaction, {
			content: ul("anchor.enabled.logs"),
		});
	}
	return await reply(interaction, {
		content: ul("context.disabled"),
	});
}

async function linkToLog(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "linkToLogs");
	if (toggle) {
		return await reply(interaction, {
			content: ul("linkToLog.enabled"),
		});
	}
	return await reply(interaction, {
		content: ul("linkToLog.disabled"),
	});
}
