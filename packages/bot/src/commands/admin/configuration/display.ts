import type { Translation } from "@dicelette/types";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import type { EClient } from "@dicelette/bot-core";
import dedent from "dedent";
import * as Djs from "discord.js";
import { selfRegisterAllowance } from "utils";
import { findLocale, formatDuration } from "./utils";

export async function displayTemplate(
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
			const otherSettings = client.template.get(interaction.guildId!);
			if (otherSettings) {
				const diceType = otherSettings.diceType;
				if (diceType) {
					templateEmbed.addFields({
						name: ul("common.dice").toTitle(),
						value: `\`${diceType}\``,
					});
				}
				const customCriticals = otherSettings.customCritical;
				if (customCriticals) {
					const mapped = Object.entries(customCriticals).map(
						([key, value]) =>
							`- **${key}**${ul("common.space")}: \`${value.sign} ${value.value}\``
					);
					templateEmbed.addFields({
						name: ul("config.customCritical"),
						value: mapped.join("\n"),
					});
				}
				const criticals = otherSettings.critical;
				if (criticals) {
					const fumbled = criticals.failure;
					const success = criticals.success;
					const res = [];
					if (fumbled) res.push(`**${ul("roll.critical.failure")}**: ${fumbled}`);
					if (success) res.push(`**${ul("roll.critical.success")}**: ${success}`);
					if (res.length > 0) {
						templateEmbed.addFields({
							name: ul("common.critical").toTitle(),
							value: res.join("\n"),
						});
					}
				}
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
export async function display(
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
		type?: "role" | "chan" | "time_delete" | "text" | "timer" | "selfRegister"
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
		if (type === "selfRegister") {
			const selfRegister = selfRegisterAllowance(guildSettings.allowSelfRegister);
			if (!selfRegister || !selfRegister.allowSelfRegister) return ul("common.no");
			const res = [
				`__**${ul("display.allowSelfRegister")}**__ ${selfRegister.allowSelfRegister ? ul("common.yes") : ul("common.no")}`,
				`__**${ul("display.moderation")}**__ ${selfRegister.moderation ? ul("common.yes") : ul("common.no")}`,
				`__**${ul("display.disallowChannel")}**__ ${selfRegister.disallowChannel ? ul("common.yes") : ul("common.no")}`,
			];
			return `- ${res.join("\n- ")}`;
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

		.setColor("Random")
		.addFields(
			{
				inline: true,
				name: ul("config.lang.options.name").capitalize(),
				value: userLocale.capitalize(),
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
				value: `${dp(guildSettings.allowSelfRegister, "selfRegister")}`,
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
	if (interaction.guild!.iconURL())
		baseEmbed.setThumbnail(interaction.guild!.iconURL({ extension: "png", size: 128 }));
	const embeds = [baseEmbed];
	await interaction.reply({ embeds });
}
