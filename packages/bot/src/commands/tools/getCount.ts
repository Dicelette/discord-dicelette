/** biome-ignore-all lint/style/useNamingConvention: Discord doesn't use CamelCase in their API */
import type { EClient } from "client";
import * as Djs from "discord.js";
import "discord_ext";
import { cmdLn } from "@dicelette/localization";
import type { Count, DBCount, Translation } from "@dicelette/types";
import { t } from "i18next";
import { getLangAndConfig } from "utils";

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

// Map des titres pour éviter le switch répétitif
function getTitle(option: Options, ul: Translation) {
	const titles: Record<Options, string> = {
		criticalSuccess: ul("roll.critical.success"),
		criticalFailure: ul("roll.critical.failure"),
		success: ul("roll.success"),
		failure: ul("roll.failure"),
		total: ul("common.total"),
	};
	return titles[option];
}

/**
 * Gère la sous-commande pour afficher le compteur d'un utilisateur
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

	const totalRoll = count.success + count.failure;

	const resultEmbed = new Djs.EmbedBuilder()
		.setTitle(ul("luckMeter.count.title").toTitle())
		.setThumbnail(
			user.displayAvatarURL() ??
				user.avatarURL() ??
				interaction.user.avatarURL() ??
				interaction.guild!.iconURL()
		)
		.setDescription(
			`${ul("luckMeter.count.desc", { user: Djs.userMention(user.id) })}\n-# ${ul("luckMeter.count.note")}`
		)
		.addFields(
			{
				name: ul("roll.success"),
				value: `${count.success} (${percentage(count.success, totalRoll)}%)`,
				inline: true,
			},
			{
				name: ul("roll.failure"),
				value: `${count.failure} (${percentage(count.failure, totalRoll)}%)`,
				inline: true,
			},
			{
				name: "\u200B",
				value: "\u200B",
				inline: true,
			},
			{
				name: ul("roll.critical.success"),
				value: `${count.criticalSuccess} (${percentage(count.criticalSuccess, totalRoll)}%)`,
				inline: true,
			},
			{
				name: ul("roll.critical.failure"),
				value: `${count.criticalFailure} (${percentage(count.criticalFailure, totalRoll)}%)`,
				inline: true,
			}
		)
		.setColor(Djs.Colors.Blurple)
		.setFooter({ text: ul("luckMeter.count.total", { count: totalRoll }) })
		.setTimestamp();

	await interaction.editReply({ embeds: [resultEmbed] });
}

function descriptionLeaderBoard(guildCount: DBCount, option: Options) {
	const sorted = Object.entries(guildCount).sort((a, b) => b[1][option]! - a[1][option]!);
	const top10 = sorted.slice(0, 10);

	return top10
		.map(([userId, data], i) => {
			const value = data[option];
			const total = data.total;
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

/**
 * Gère la sous-commande pour afficher le classement
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
		const userCount = guildCount[userId];
		userCount.total = userCount.success + userCount.failure;
	}
	if (!option) {
		// aucune option: créer un composant par catégorie
		const components = ALL_OPTIONS.map((opt) => {
			const description = descriptionLeaderBoard(guildCount, opt);
			return new Djs.ContainerBuilder()
				.setAccentColor(generateRandomColor())
				.addTextDisplayComponents(
					new Djs.TextDisplayBuilder().setContent(
						`# ${getTitle(opt, ul)}\n\n${description}`
					)
				);
		});
		await interaction.editReply({
			withComponents: true,
			components,
			flags: Djs.MessageFlags.IsComponentsV2,
			allowedMentions: { users: [], repliedUser: false, parse: [], roles: [] },
		});
		return;
	}

	// Affichage du top 10 pour l'option choisie
	const description = descriptionLeaderBoard(guildCount, option);

	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("luckerMeter.leaderboard.title").toTitle())
		.setDescription(description || ul("luckMeter.leaderboard.noData"))
		.setColor(Djs.Colors.Blurple)
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Calcule les totaux et moyennes pour tous les utilisateurs
 */
function calculateServerStats(guildCount: Record<string, Count>) {
	const totalCount: Count = {
		success: 0,
		failure: 0,
		criticalFailure: 0,
		criticalSuccess: 0,
	};

	let usersWithCounts = 0;
	let rollTotal = 0;

	for (const userId in guildCount) {
		const userCount = guildCount[userId];
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

	return { totalCount, usersWithCounts, rollTotal };
}

/**
 * Gère la sous-commande pour afficher les moyennes du serveur
 */
async function average(
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

	const percent = {
		success: percentage(totalCount.success, rollTotal),
		failure: percentage(totalCount.failure, rollTotal),
		criticalSuccess: percentage(totalCount.criticalSuccess, rollTotal),
		criticalFailure: percentage(totalCount.criticalFailure, rollTotal),
	};

	const avg = {
		success: averageValue(totalCount.success, usersWithCounts),
		failure: averageValue(totalCount.failure, usersWithCounts),
		criticalSuccess: averageValue(totalCount.criticalSuccess, usersWithCounts),
		criticalFailure: averageValue(totalCount.criticalFailure, usersWithCounts),
	};

	const embedResult = new Djs.EmbedBuilder()
		.setTitle(ul("luckMeter.moy.title").toTitle())
		.setThumbnail((interaction.guild!.iconURL() as string) ?? undefined)
		.setDescription(ul("luckMeter.moy.result", { rollTotal, usersWithCounts }))
		.addFields(
			{
				name: ul("roll.success"),
				value: `[${totalCount.success}] ${avg.success} (${percent.success}%)`,
			},
			{
				name: ul("roll.failure"),
				value: `[${totalCount.failure}] ${avg.failure} (${percent.failure}%)`,
			},
			{
				name: ul("roll.critical.success"),
				value: `[${totalCount.criticalSuccess}] ${avg.criticalSuccess} (${percent.criticalSuccess}%)`,
			},
			{
				name: ul("roll.critical.failure"),
				value: `[${totalCount.criticalFailure}] ${avg.criticalFailure} (${percent.criticalFailure}%)`,
			}
		)
		.setColor(Djs.Colors.Blurple)
		.setTimestamp();

	await interaction.editReply({
		embeds: [embedResult],
		allowedMentions: { users: [], repliedUser: false, parse: [], roles: [] },
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

export const getCount = {
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
						.setDescription("luckMeter.userOption.description")
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
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("luckMeter.moy.title").setDescriptions("luckMeter.moy.desc")
		),

	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;

		const subcmd = interaction.options.getSubcommand();
		const { ul } = getLangAndConfig(client, interaction, interaction.guild.id);

		await interaction.deferReply();

		switch (subcmd) {
			case t("luckMeter.count.title"):
				await bilan(interaction, client, ul);
				break;
			case t("luckerMeter.leaderboard.title"):
				await leaderboard(interaction, client, ul);
				break;
			case t("luckMeter.moy.title"):
				await average(interaction, client, ul);
				break;
		}
	},
};
