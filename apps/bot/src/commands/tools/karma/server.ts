import type { EClient } from "@dicelette/client";
import type { Count, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { calculateServerStats } from "./leaderboard";
import { serverStats } from "./utils";

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
export async function server(
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
