import type { EClient } from "@dicelette/client";
import type { Count, DBCount, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { t } from "i18next";
import { generateRandomColor } from "./bilan";
import { ALL_OPTIONS, type Options } from "./types";
import { getTitle, serverStats } from "./utils";

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
export async function leaderboard(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const option = interaction.options.getString(
		t("luckMeter.leaderboard.option.title"),
		false
	) as Options | null;

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
export function calculateServerStats(guildCount: Record<string, Count>) {
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
