import type { EClient } from "@dicelette/client";
import {
	extractCommonOptions,
	extractRollOptions,
	getGuildContext,
	getInteractionContext as getLangAndConfig,
	gmCommonOptions,
} from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import type { UserMessageId } from "@dicelette/types";
import { filterChoices } from "@dicelette/utils";
import { getMacro, getStatistics } from "database";
import * as Djs from "discord.js";
import { replyEphemeralError } from "messages";
import { rollMacro, rollStatistique } from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "../tools";
import "@dicelette/discord_ext";
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
		const ctx = getGuildContext(client, interaction.guild!.id);
		if (!ctx?.templateID) return;
		let choices: string[] = [];
		const { user } = extractCommonOptions(options);
		let allCharFromGuild: {
			charName?: string | null;
			messageId: UserMessageId;
			damageName?: string[];
			isPrivate?: boolean;
		}[] = [];
		const usersById = ctx.settings.user ?? {};

		const userId = user?.id ?? interaction.user.id;
		if (userId === interaction.user.id) {
			for (const [, char] of Object.entries(usersById)) {
				for (const data of char) {
					allCharFromGuild.push(data);
				}
			}
		} else allCharFromGuild = usersById?.[userId] ?? [];
		if (fixed.name === t("common.character")) {
			//get ALL characters from the guild
			const skill = options.getString(t("common.name"));
			if (skill) {
				const standardizedSkill = skill.standardize();
				if (ctx.standardizedDamageNames?.includes(standardizedSkill)) {
					choices = allCharFromGuild.map((data) => data.charName ?? t("common.default"));
				} else {
					//search in all characters for the skill
					const findSkillInAll = allCharFromGuild.filter((data) => {
						return data.damageName?.some(
							(damageName) => damageName.standardize() === standardizedSkill
						);
					});
					choices = findSkillInAll.map((data) => data.charName ?? t("common.default"));
				}
			} else {
				for (const data of allCharFromGuild) {
					choices.push(data.charName ? data.charName : t("common.default"));
				}
			}
		} else if (fixed.name === t("common.statistic")) {
			choices = ctx.templateID.statsName;
		} else if (fixed.name === t("common.name")) {
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
			choices.push(...ctx.templateID.damageName);
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
		const { ul } = getLangAndConfig(client, interaction);

		const user = options.getUser(t("display.userLowercase"), false) ?? undefined;
		const hide = options.getBoolean(t("common.hidden"));
		const subcommand = options.getSubcommand(true);

		// Handle the simple roll subcommand separately
		if (subcommand === ul("roll.name")) {
			const { userComments, customCritical } = extractRollOptions(options, ul);
			return await baseRoll(
				options.getString(t("common.dice"), true),
				interaction,
				client,
				hide ?? undefined,
				undefined,
				user,
				userComments,
				customCritical
			);
		}

		// For all other subcommands (dbRoll, macro, calc), get character data
		const isMacro = subcommand === ul("common.macro");
		const result = isMacro
			? await getMacro(client, ul, interaction, true, user)
			: await getStatistics(interaction, client, true, user);
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
		if (subcommand === ul("common.macro")) {
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
		}
		if (subcommand === ul("calc.title"))
			return await calculate(
				options,
				ul,
				interaction,
				client,
				charData,
				optionChar,
				hide,
				user,
				true
			);
	},
};
