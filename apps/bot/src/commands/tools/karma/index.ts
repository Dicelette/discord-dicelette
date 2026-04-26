/** biome-ignore-all lint/style/useNamingConvention: Discord doesn't use CamelCase in their API */
import type { EClient } from "@dicelette/client";
import * as Djs from "discord.js";
import "@dicelette/discord_ext";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { cmdLn } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { t } from "i18next";
import { embedError } from "messages";
import { bilan } from "./bilan";
import { chart } from "./chart";
import { leaderboard } from "./leaderboard";
import { server } from "./server";

/**
 * Creates choices for leaderboard options
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
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
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
				.addStringOption((option) =>
					option
						.setNames("luckMeter.leaderboard.sort.title")
						.setDescriptions("luckMeter.leaderboard.sort.description")
						.addChoices(
							{
								name: t("luckMeter.leaderboard.sort.brut"),
								name_localizations: cmdLn("luckMeter.leaderboard.sort.brut"),
								value: "brut",
							},
							{
								name: t("luckMeter.leaderboard.sort.ratio"),
								name_localizations: cmdLn("luckMeter.leaderboard.sort.ratio"),
								value: "ratio",
							}
						)
						.setRequired(false)
				)
				.addNumberOption((option) =>
					option
						.setNames("config.pity.option.name")
						.setDescriptions("luckMeter.leaderboard.threshold")
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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("luckMeter.chart.title")
				.setDescriptions("luckMeter.chart.description")
				.addBooleanOption((option) =>
					option.setNames("common.ephemeral").setDescriptions("luckMeter.ephemeral")
				)
		),

	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;

		const subcmd = interaction.options.getSubcommand();
		const { ul } = getLangAndConfig(client, interaction, interaction.guild.id);
		const flags = interaction.options.getBoolean(t("common.ephemeral")) ?? true;

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
			case t("luckMeter.chart.title"):
				await chart(interaction, client, ul);
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
	// First, we verify if the user has permission to do this
	// Only admins (role management) can reset the leaderboard of others
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
