import { extractCommonOptions, gmCommonOptions } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { ln, t } from "@dicelette/localization";
import type { UserMessageId } from "@dicelette/types";
import { filterChoices } from "@dicelette/utils";
import { getStatistics } from "database";
import * as Djs from "discord.js";
import { replyEphemeralError } from "messages";
import { rollMacro, rollStatistique } from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "../tools";
import "discord_ext";
import { capitalizeBetweenPunct } from "@dicelette/utils";
import { baseRoll } from "./base_roll";

export const mjRoll = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(interaction, interaction.locale);
		if (transform) return await interaction.respond(transform);
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData || !guildData.templateID) return;
		let choices: string[] = [];
		const { user } = extractCommonOptions(options);
		let allCharFromGuild: {
			charName?: string | null;
			messageId: UserMessageId;
			damageName?: string[];
			isPrivate?: boolean;
		}[] = [];

		const userId = user?.id ?? interaction.user.id;
		if (userId === interaction.user.id) {
			for (const [, char] of Object.entries(guildData.user)) {
				for (const data of char) {
					allCharFromGuild.push(data);
				}
			}
		} else allCharFromGuild = guildData.user?.[userId];
		if (fixed.name === t("common.character")) {
			//get ALL characters from the guild
			const skill = options.getString(t("common.name"));
			if (skill) {
				if (
					guildData.templateID.damageName
						?.map((x) => x.standardize())
						.includes(skill.standardize())
				) {
					choices = allCharFromGuild.map((data) => data.charName ?? t("common.default"));
				} else {
					//search in all characters for the skill
					const findSkillInAll = allCharFromGuild.filter((data) => {
						return data.damageName?.includes(skill);
					});
					choices = findSkillInAll.map((data) => data.charName ?? t("common.default"));
				}
			} else {
				for (const data of allCharFromGuild) {
					choices.push(data.charName ? data.charName : t("common.default"));
				}
			}
		} else if (fixed.name === t("common.statistic")) {
			choices = guildData.templateID.statsName;
		} else if (fixed.name === t("common.name")) {
			const defaultDice = guildData.templateID.damageName;

			const character = options.getString(t("common.character"), false);
			if (character) {
				const char = allCharFromGuild.find((c) => c.charName?.subText(character));
				if (char?.damageName) {
					choices = char.damageName;
				}
			} else {
				for (const data of allCharFromGuild) {
					if (data.damageName) choices.push(...data.damageName);
				}
			}
			choices.push(...defaultDice);
		}
		if (!choices || choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
	},
	data: new Djs.SlashCommandBuilder()
		.setNames("mjRoll.name")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setDescriptions("mjRoll.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.addSubcommand(
			(
				sub //dbRoll
			) =>
				gmCommonOptions(sub, "dbroll")
					.setNames("dbRoll.name")
					.setDescriptions("dbRoll.description")
		)
		.addSubcommand(
			(
				sub //macro
			) =>
				gmCommonOptions(sub, "macro")
					.setNames("common.macro")
					.setDescriptions("rAtq.description")
		)
		.addSubcommand(
			(
				sub //calc
			) =>
				gmCommonOptions(sub, "calc")
					.setNames("calc.title")
					.setDescriptions("calc.description")
		)
		.addSubcommand((sub) =>
			gmCommonOptions(sub, "roll")
				.setNames("roll.name")
				.setDescriptions("roll.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const ul = ln(client.settings.get(interaction.guild.id)?.lang ?? interaction.locale);

		const user = options.getUser(t("display.userLowercase"), false) ?? undefined;
		const hide = options.getBoolean(t("dbRoll.options.hidden.name"));
		const subcommand = options.getSubcommand(true);

		// Handle the simple roll subcommand separately
		if (subcommand === ul("roll.name"))
			return await baseRoll(
				options.getString(t("common.dice"), true),
				interaction,
				client,
				hide ?? undefined,
				undefined,
				user
			);

		// For all other subcommands (dbRoll, macro, calc), get character data
		const result = await getStatistics(interaction, client, true, user);
		if (!result) return;
		const { userStatistique: charData, optionChar } = result;

		if (!charData) {
			const text = ul("error.user.youRegistered");
			await replyEphemeralError(interaction, text, ul);
			return;
		}

		if (subcommand === ul("dbRoll.name"))
			return await rollStatistique(
				interaction,
				client,
				charData,
				options,
				ul,
				optionChar,
				user,
				hide
			);
		if (subcommand === ul("common.macro"))
			return await rollMacro(
				interaction,
				client,
				charData,
				options,
				ul,
				optionChar,
				user,
				hide
			);
		if (subcommand === ul("calc.title"))
			return await calculate(
				options,
				ul,
				interaction,
				client,
				charData,
				optionChar,
				hide,
				user
			);
	},
};
