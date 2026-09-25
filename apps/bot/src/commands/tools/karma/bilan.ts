import type { EClient } from "@dicelette/client";
import { fetchAvatarUrl } from "@dicelette/helpers";
import type { Count, Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { gaugeEmoji, percentage } from "./utils";

/** Shows a user's success/failure counts for the current guild. */
export async function bilan(
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

/** Builds the component-based bilan (stat summary) display for a member's luck meter. */
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
		if (consecutive && consecutive > 1) {
			lines.push(
				`  - **${ul(`luckMeter.count.consecutive.${countType}`)}**${ul("common.space")}: ${consecutive} ${gaugeEmoji(countType, consecutive)}`
			);
		}

		const longestStreak = count.longestStreak?.[countType];
		if (longestStreak && longestStreak > 1) {
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
				text.setContent(`-# __${ul("luckMeter.count.total", { count: totalRoll })}__`)
			),
	];
}

export function generateRandomColor() {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return Number.parseInt(color.replace("#", ""), 16);
}
