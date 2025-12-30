/** biome-ignore-all lint/style/useNamingConvention: Discord doesn't use CamelCase in their API */
import type { EClient } from "@dicelette/client";
import * as Djs from "discord.js";
import "discord_ext";
import {
	fetchAvatarUrl,
	getInteractionContext as getLangAndConfig,
} from "@dicelette/bot-helpers";
import { cmdLn } from "@dicelette/localization";
import type { Count, DBCount, Translation } from "@dicelette/types";
import { t } from "i18next";
import { embedError } from "messages";

function percentage(partial: number, total: number) {
	return total === 0 ? "0.00" : ((partial / total) * 100).toFixed(2);
}

function averageValue(total: number, count: number) {
	return count === 0 ? "0.00" : (total / count).toFixed(2);
}

type Options = "criticalSuccess" | "criticalFailure" | "success" | "failure" | "total";

const ALL_OPTIONS: Options[] = [
	"total",
	"success",
	"failure",
	"criticalSuccess",
	"criticalFailure",
];

/**
 * Return the localized title corresponding to the given option.
 *
 * @param option - The option key to localize
 * @param ul - Translation helper that maps localization keys to strings
 * @returns The localized title for `option`
 */
function getTitle(option: Options, ul: Translation) {
	const titles: Record<Options, string> = {
		criticalFailure: ul("roll.critical.failure"),
		criticalSuccess: ul("roll.critical.success"),
		failure: ul("roll.failure"),
		success: ul("roll.success"),
		total: ul("common.total"),
	};
	return titles[option];
}

/**
 * Selects an emoji representing a consecutive success or failure streak.
 *
 * @param type - "success" to choose from success emojis, "failure" to choose from failure emojis
 * @param value - The consecutive-streak length
 * @returns An emoji chosen by `type` and `value`: empty string for `value` ≤ 1; for `value` > 1 and ≤ 5 the first emoji (`"😎"` or `"😔"`); for `value` > 5 and ≤ 10 the second emoji (`"🔥"` or `"💔"`); for `value` > 10 the third emoji (`"🐐"` or `"💀"`)
 */
function gaugeEmoji(type: "success" | "failure", value: number) {
	if (value <= 1) return "";
	const successEmoji = ["😎", "🔥", "🐐"];
	const failureEmoji = ["😔", "💔", "💀"];
	const emoji = type === "success" ? successEmoji : failureEmoji;
	if (value > 1 && value <= 5) return emoji[0];
	if (value > 5 && value <= 10) return emoji[1];
	if (value > 10) return emoji[2];
	return "";
}

/**
 * Build a component-based bilan (stat summary) display for a member's luck meter.
 *
 * @param count - The user's counts (expects `success`, `failure`, `criticalSuccess`, `criticalFailure`, optional `consecutive` and `longestStreak` objects).
 * @param ul - Translation helper used to localize titles and labels.
 * @param member - Guild member whose avatar and mention are shown.
 * @param guild - Guild used to resolve the member's avatar URL.
 * @returns An array containing a single `ContainerBuilder` configured with thumbnail, localized text sections, separators, and a final total line representing the member's bilan.
 */
async function generateComponentsForBilan(
	count: Count,
	ul: Translation,
	member: Djs.GuildMember,
	guild: Djs.Guild
) {
	const totalRoll = count.success + count.failure;
	const avatar = await fetchAvatarUrl(guild, member.user, member);

	const buildStatSection = (countType: "success" | "failure") => {
		const lines = [
			`- __**${ul(`roll.${countType}`)}**__${ul("common.space")}: ${count[countType]} (${percentage(count[countType], totalRoll)}%)`,
		];

		if (countType === "success" && count.criticalSuccess > 0) {
			lines.push(
				`  - **${ul("luckMeter.count.including")} ${ul("roll.critical.success").toLowerCase()}**${ul("common.space")}: ${count.criticalSuccess} (${percentage(count.criticalSuccess, totalRoll)}%)`
			);
		} else if (countType === "failure" && count.criticalFailure > 0) {
			lines.push(
				`  - **${ul("luckMeter.count.including")} ${ul("roll.critical.failure").toLowerCase()}**${ul("common.space")}: ${count.criticalFailure} (${percentage(count.criticalFailure, totalRoll)}%)`
			);
		}

		const consecutive = count.consecutive?.[countType];
		if (consecutive && consecutive > 0) {
			lines.push(
				`  - **${ul(`luckMeter.count.consecutive.${countType}`)}**${ul("common.space")}: ${consecutive} ${gaugeEmoji(countType, consecutive)}`
			);
		} else {
			lines.push(
				`  - **${ul(`luckMeter.count.consecutive.${countType}`)}**${ul("common.space")}: ${ul("common.noSet")}`
			);
		}

		const longestStreak = count.longestStreak?.[countType];
		if (longestStreak && longestStreak > 0) {
			lines.push(
				`  - **${ul(`luckMeter.count.longest.${countType}`)}**${ul("common.space")}: ${longestStreak}`
			);
		}

		return lines;
	};

	const allLines = [
		`# ${ul("luckMeter.count.title").toTitle()}`,
		ul("luckMeter.count.desc", { user: Djs.userMention(member.id) }),
		...buildStatSection("success"),
		"",
		...buildStatSection("failure"),
	];

	return [
		new Djs.ContainerBuilder()
			.setAccentColor(generateRandomColor())
			.addSectionComponents((section) =>
				section
					.setThumbnailAccessory((access) => access.setURL(avatar))
					.addTextDisplayComponents((text) => text.setContent(allLines.join("\n")))
			)
			.addSeparatorComponents((sep) =>
				sep.setSpacing(Djs.SeparatorSpacingSize.Small).setDivider(true)
			)
			.addTextDisplayComponents((text) =>
				text.setContent(`-# __${ul("common.total", { count: totalRoll })}__`)
			),
	];
}

/**
 * Shows a user's success and failure counts for the current guild using component-based output.
 *
 * If the user has no recorded counts, edits the reply with a localized error message.
 *
 * @param interaction - The command interaction used to read options and edit the deferred reply
 * @param client - The bot client instance that stores user counts
 * @param ul - Localization function for generating translated messages
 */
async function bilan(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const user = interaction.options.getUser("user") ?? interaction.user;
	const count = client.criticalCount.get(interaction.guild!.id, user.id);

	if (!count) {
		await interaction.editReply({
			content: ul("luckMeter.error", { user: Djs.userMention(user.id) }),
		});
		return;
	}

	const member = await interaction.guild!.members.fetch(user.id);
	const components = await generateComponentsForBilan(
		count,
		ul,
		member,
		interaction.guild!
	);
	await interaction.editReply({
		allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
		components,
		flags: Djs.MessageFlags.IsComponentsV2,
	});
}

function descriptionLeaderBoard(guildCount: DBCount, option: Options) {
	const sorted = Object.entries(guildCount).sort(
		(a, b) => (b[1]?.[option] ?? 0) - (a[1]?.[option] ?? 0)
	);
	const top10 = sorted.slice(0, 10);

	return top10
		.filter(([, data]) => (data?.[option] ?? 0) > 0)
		.map(([userId, data], i) => {
			const value = data?.[option] ?? 0;
			const total = data?.total ?? 0;
			return option === "total"
				? `**${i + 1}.** ${Djs.userMention(userId)}: ${value}`
				: `**${i + 1}.** ${Djs.userMention(userId)}: ${value}/${total}`;
		})
		.join("\n");
}

function generateRandomColor() {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return Number.parseInt(color.replace("#", ""), 16);
}

function componentServerStats(
	server: { totalCount: Count; usersWithCounts: number; rollTotal: number },
	ul: Translation
) {
	const { totalCount, usersWithCounts, rollTotal } = server;
	const { percent, avg } = serverStats(totalCount, rollTotal, usersWithCounts);
	const descriptions = [`# ${ul("luckMeter.moy.title").toTitle()}`];
	descriptions.push(
		`- __${ul("roll.success")}__${ul("common.space")}: [${totalCount.success}] ${avg.success} (${percent.success}%)`
	);
	if (totalCount.criticalSuccess > 0) {
		descriptions.push(
			`  - ${ul("luckMeter.count.including")} ${ul("roll.critical.success").toLowerCase()}${ul("common.space")}: [${totalCount.criticalSuccess}] ${avg.criticalSuccess} (${percent.criticalSuccess}%)`
		);
	}
	descriptions.push(
		`- __${ul("roll.failure")}__${ul("common.space")}: [${totalCount.failure}] ${avg.failure} (${percent.failure}%)`
	);
	if (totalCount.criticalFailure > 0) {
		descriptions.push(
			`  - ${ul("luckMeter.count.including")} ${ul("roll.critical.failure").toLowerCase()}${ul("common.space")}: [${totalCount.criticalFailure}] ${avg.criticalFailure} (${percent.criticalFailure}%)`
		);
	}
	descriptions.push(`-# ${ul("luckMeter.moy.result", { rollTotal, usersWithCounts })}`);
	const component = new Djs.TextDisplayBuilder().setContent(descriptions.join("\n"));
	return new Djs.ContainerBuilder()
		.setAccentColor(generateRandomColor())
		.addTextDisplayComponents(component);
}

/**
 * Display the leaderboard for the specified option or all options if none is specified
 * @param interaction The interaction that triggered the command
 * @param client The bot client
 * @param ul The translation function
 */
async function leaderboard(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const option = interaction.options.getString(
		t("luckMeter.leaderboard.option.title"),
		false
	) as
		| "criticalSuccess"
		| "criticalFailure"
		| "success"
		| "failure"
		| "total"
		| undefined
		| null;

	const guildCount = client.criticalCount.get(interaction.guild!.id);
	if (!guildCount) {
		await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
		return;
	}

	for (const userId in guildCount) {
		const defaultCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 0,
			total: 0,
		};
		//fusion des valeurs manquantes
		guildCount[userId] = Object.assign(defaultCount, guildCount[userId]);
		guildCount[userId].total = guildCount[userId].success + guildCount[userId].failure;
	}
	if (!option) {
		// Display all leaderboards if no specific option is chosen
		const components = ALL_OPTIONS.map((opt) => {
			const description = descriptionLeaderBoard(guildCount, opt);
			if (!description.length) return undefined;
			return new Djs.ContainerBuilder()
				.setAccentColor(generateRandomColor())
				.addTextDisplayComponents(
					new Djs.TextDisplayBuilder().setContent(
						`# ${getTitle(opt, ul)}\n\n${description}`
					)
				);
		}).filter((c): c is Djs.ContainerBuilder => !!c);
		if (components.length === 0) {
			await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
			return;
		}
		const serverStats = calculateServerStats(guildCount);
		const serverComponents = componentServerStats(serverStats, ul);
		components.unshift(serverComponents);

		await interaction.editReply({
			allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
			components,
			flags: Djs.MessageFlags.IsComponentsV2,
			withComponents: true,
		});
		return;
	}

	// Display the top 10 for the selected option
	const description = descriptionLeaderBoard(guildCount, option);

	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("luckerMeter.leaderboard.title").toTitle())
		.setDescription(description || ul("luckMeter.leaderboard.noData"))
		.setColor(generateRandomColor())
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Calcule les totaux et moyennes pour tous les utilisateurs
 */
function calculateServerStats(guildCount: Record<string, Count>) {
	const totalCount: Count = {
		criticalFailure: 0,
		criticalSuccess: 0,
		failure: 0,
		success: 0,
	};

	let usersWithCounts = 0;
	let rollTotal = 0;

	for (const userId in guildCount) {
		const defaultCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 0,
			total: 0,
		};
		//fusion des valeurs manquantes
		const userCount = Object.assign(defaultCount, guildCount[userId]);
		const totalRolls = userCount.success + userCount.failure;

		if (totalRolls > 0) {
			totalCount.success += userCount.success;
			totalCount.failure += userCount.failure;
			totalCount.criticalSuccess += userCount.criticalSuccess;
			totalCount.criticalFailure += userCount.criticalFailure;
			usersWithCounts++;
			rollTotal += totalRolls;
		}
	}

	return { rollTotal, totalCount, usersWithCounts };
}

function generateServerFields(
	ul: Translation,
	totalCount: Count,
	avg: Record<string, string>,
	percent: Record<string, string>
) {
	const fields: Djs.EmbedField[] = [
		{
			inline: true,
			name: ul("roll.success"),
			value: `[${totalCount.success}] ${avg.success} (${percent.success}%)`,
		},
	];
	if (totalCount.criticalSuccess > 0) {
		fields.push({
			inline: true,
			name: `${ul("luckMeter.count.including")} ${ul("roll.critical.success").toLowerCase()}`,
			value: `[${totalCount.criticalSuccess}] ${avg.criticalSuccess} (${percent.criticalSuccess}%)`,
		});
	}
	fields.push({ inline: false, name: "\u200B", value: "\u200B" });
	fields.push({
		inline: true,
		name: ul("roll.failure"),
		value: `[${totalCount.failure}] ${avg.failure} (${percent.failure}%)`,
	});
	if (totalCount.criticalFailure > 0) {
		fields.push({
			inline: true,
			name: `${ul("luckMeter.count.including")} ${ul("roll.critical.failure").toLowerCase()}`,
			value: `[${totalCount.criticalFailure}] ${avg.criticalFailure} (${percent.criticalFailure}%)`,
		});
	}
	return fields;
}

function serverStats(totalCount: Count, rollTotal: number, usersWithCounts: number) {
	const percent = {
		criticalFailure: percentage(totalCount.criticalFailure, rollTotal),
		criticalSuccess: percentage(totalCount.criticalSuccess, rollTotal),
		failure: percentage(totalCount.failure, rollTotal),
		success: percentage(totalCount.success, rollTotal),
	};

	const avg = {
		criticalFailure: averageValue(totalCount.criticalFailure, usersWithCounts),
		criticalSuccess: averageValue(totalCount.criticalSuccess, usersWithCounts),
		failure: averageValue(totalCount.failure, usersWithCounts),
		success: averageValue(totalCount.success, usersWithCounts),
	};
	return { avg, percent };
}

function serverStatsEmbed(
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction,
	totalCount: Count,
	usersWithCounts: number,
	rollTotal: number
) {
	const { percent, avg } = serverStats(totalCount, rollTotal, usersWithCounts);

	return new Djs.EmbedBuilder()
		.setTitle(ul("luckMeter.moy.title").toTitle())
		.setThumbnail((interaction.guild!.iconURL() as string) ?? undefined)
		.setDescription(ul("luckMeter.moy.result", { rollTotal, usersWithCounts }))
		.addFields(generateServerFields(ul, totalCount, avg, percent))
		.setColor(Djs.Colors.Blurple)
		.setTimestamp();
}

/**
 * Display the average stats for the server
 * @param interaction The interaction that triggered the command
 * @param client The bot client
 * @param ul The translation function
 */
async function server(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const guildCount = client.criticalCount.get(interaction.guild!.id);
	if (!guildCount) {
		await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
		return;
	}

	const { totalCount, usersWithCounts, rollTotal } = calculateServerStats(guildCount);

	if (usersWithCounts === 0) {
		await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
		return;
	}

	const embedResult = serverStatsEmbed(
		ul,
		interaction,
		totalCount,
		usersWithCounts,
		rollTotal
	);

	await interaction.editReply({
		allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
		embeds: [embedResult],
	});
}

/**
 * Crée les choix pour les options de classement
 */
function leaderBoardChoices() {
	return [
		{
			name: t("roll.critical.success"),
			name_localizations: cmdLn("roll.critical.success"),
			value: "criticalSuccess",
		},
		{
			name: t("roll.critical.failure"),
			name_localizations: cmdLn("roll.critical.failure"),
			value: "criticalFailure",
		},
		{
			name: t("roll.success"),
			name_localizations: cmdLn("roll.success"),
			value: "success",
		},
		{
			name: t("roll.failure"),
			name_localizations: cmdLn("roll.failure"),
			value: "failure",
		},
		{
			name: t("luckMeter.leaderboard.option.total"),
			name_localizations: cmdLn("luckMeter.leaderboard.option.total"),
			value: "total",
		},
	];
}

const getCount = {
	data: new Djs.SlashCommandBuilder()
		.setNames("luckMeter.title")
		.setDescriptions("luckMeter.description")
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("luckMeter.count.title")
				.setDescriptions("luckMeter.description")
				.addUserOption((option) =>
					option
						.setNames("edit.user.title")
						.setDescriptions("luckMeter.userOption.description")
				)
				.addBooleanOption((option) =>
					option.setNames("common.ephemeral").setDescriptions("luckMeter.ephemeral")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("luckerMeter.leaderboard.title")
				.setDescriptions("luckerMeter.leaderboard.description")
				.addStringOption((option) =>
					option
						.setNames("luckMeter.leaderboard.option.title")
						.setDescriptions("luckMeter.leaderboard.option.description")
						.addChoices(...leaderBoardChoices())
						.setRequired(false)
				)
				.addBooleanOption((option) =>
					option.setNames("common.ephemeral").setDescriptions("luckMeter.ephemeral")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("luckMeter.moy.title")
				.setDescriptions("luckMeter.moy.desc")
				.addBooleanOption((option) =>
					option.setNames("common.ephemeral").setDescriptions("luckMeter.ephemeral")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("luckMeter.reset.title")
				.setDescriptions("luckMeter.reset.description")
				.addBooleanOption((option) =>
					option
						.setNames("luckMeter.reset.all.name")
						.setDescriptions("luckMeter.reset.all.description")
				)
				.addUserOption((option) =>
					option
						.setNames("edit.user.title")
						.setDescriptions("luckMeter.reset.user.description")
				)
		),

	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;

		const subcmd = interaction.options.getSubcommand();
		const { ul } = getLangAndConfig(client, interaction, interaction.guild.id);
		const flags = interaction.options.getBoolean(t("common.ephemeral"));

		await interaction.deferReply(
			flags || subcmd === t("luckMeter.reset.title")
				? { flags: Djs.MessageFlags.Ephemeral }
				: undefined
		);

		switch (subcmd) {
			case t("luckMeter.count.title"):
				await bilan(interaction, client, ul);
				break;
			case t("luckerMeter.leaderboard.title"):
				await leaderboard(interaction, client, ul);
				break;
			case t("luckMeter.moy.title"):
				await server(interaction, client, ul);
				break;
			case t("luckMeter.reset.title"):
				await resetCount(interaction, client, ul);
				break;
		}
	},
};

async function resetCount(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const resetAll = interaction.options.getBoolean(t("luckMeter.reset.all.name"));
	const selectedUser = interaction.options.getUser("user");
	const guildId = interaction.guild!.id;
	//!!! D'abord, on vérifie si le user a la permission de faire ça
	//!!! Seul les admins (gestions des rôles) peuvent réinitialiser le classement des autres
	const isRoleManager = interaction.memberPermissions?.has(
		Djs.PermissionFlagsBits.ManageRoles
	);
	if (!resetAll && !selectedUser) {
		// Reset own count
		client.criticalCount.delete(guildId, interaction.user.id);
		await interaction.editReply({
			content: ul("luckMeter.reset.self.success"),
		});
		return;
	}
	if (!isRoleManager && (resetAll || selectedUser)) {
		await interaction.editReply({
			embeds: [embedError(ul("luckMeter.reset.noPermission"), ul)],
		});
		return;
	}
	if (resetAll) {
		// Reset all counts
		client.criticalCount.delete(guildId);
		await interaction.editReply({
			content: ul("luckMeter.reset.all.success"),
		});
		return;
	}
	// Reset selected user's count
	client.criticalCount.delete(guildId, selectedUser!.id);
	await interaction.editReply({
		content: ul("luckMeter.reset.user.success", {
			user: Djs.userMention(selectedUser!.id),
		}),
	});
}

export default getCount;
