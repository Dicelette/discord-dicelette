/** biome-ignore-all lint/style/useNamingConvention: Discord doesn't use CamelCase in their API */
import type { EClient } from "client";
import * as Djs from "discord.js";
import "discord_ext";
import { cmdLn } from "@dicelette/localization";
import type { Count, DBCount, Translation } from "@dicelette/types";
import { t } from "i18next";
import { getLangAndConfig } from "utils";

function percentage(partial: number, total: number) {
	return total === 0 ? 0 : ((partial / total) * 100).toFixed(2);
}

type Options = "criticalSuccess" | "criticalFailure" | "success" | "failure" | "total";

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
		.setDescription(ul("luckMeter.count.desc", { user: Djs.userMention(user.id) }))
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

	let description = "";
	for (let i = 0; i < top10.length; i++) {
		const userId = top10[i][0];
		const count = top10[i][1][option];
		const total = top10[i][1].total;
		description +=
			option === "total"
				? `**${i + 1}.** ${Djs.userMention(userId)}: ${count}\n`
				: `**${i + 1}.** ${Djs.userMention(userId)}: ${count}/${total}\n`;
	}
	return description;
}

function getTitle(option: Options, ul: Translation) {
	switch (option) {
		case "criticalSuccess":
			return ul("roll.critical.success");
		case "criticalFailure":
			return ul("roll.critical.failure");
		case "success":
			return ul("roll.success");
		case "failure":
			return ul("roll.failure");
		case "total":
			return ul("common.total");
	}
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
		//si aucune option, on affiche tout dans un embed
		const options: Options[] = [
			"total",
			"success",
			"failure",
			"criticalSuccess",
			"criticalFailure",
		];
		const embeds = [];
		for (const opt of options) {
			const description = descriptionLeaderBoard(guildCount, opt);
			const components = new Djs.ContainerBuilder()
				.setAccentColor(generateRandomColor())
				.addTextDisplayComponents(
					new Djs.TextDisplayBuilder().setContent(
						`# ${getTitle(opt, ul)}\n\n${description}`
					)
				);

			embeds.push(components);

			//use componentV2 to create a cute embed
		}
		await interaction.editReply({
			withComponents: true,
			components: embeds,
			flags: Djs.MessageFlags.IsComponentsV2,
			allowedMentions: { users: [], repliedUser: false, parse: [], roles: [] },
		});
		return;
	}

	// Affichage du top 10 des utilisateurs avec le plus haut compteur pour l'option sélectionnée
	const description = descriptionLeaderBoard(guildCount, option);

	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("luckerMeter.leaderboard.title").toTitle())
		.setDescription(description)
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

	const result = {
		success: percentage(totalCount.success, rollTotal),
		failure: percentage(totalCount.failure, rollTotal),
		criticalSuccess: percentage(totalCount.criticalSuccess, rollTotal),
		criticalFailure: percentage(totalCount.criticalFailure, rollTotal),
	};

	const embedResult = new Djs.EmbedBuilder()
		.setTitle(ul("luckMeter.moy.title").toTitle())
		.setThumbnail((interaction.guild!.iconURL() as string) ?? undefined)
		.setDescription(ul("luckMeter.moy.result", { rollTotal, usersWithCounts }))
		.addFields(
			{
				name: ul("roll.success"),
				value: `[${totalCount.success}] ${result.success} (${percent.success}%)`,
			},
			{
				name: ul("roll.failure"),
				value: `[${totalCount.failure}] ${result.failure} (${percent.failure}%)`,
			},
			{
				name: ul("roll.critical.success"),
				value: `[${totalCount.criticalSuccess}] ${result.criticalSuccess} (${percent.criticalSuccess}%)`,
			},
			{
				name: ul("roll.critical.failure"),
				value: `[${totalCount.criticalFailure}] ${result.criticalFailure} (${percent.criticalFailure}%)`,
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
