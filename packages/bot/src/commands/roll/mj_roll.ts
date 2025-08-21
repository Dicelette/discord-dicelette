import { ln, t } from "@dicelette/localization";
import type { UserData, UserMessageId } from "@dicelette/types";
import {
	capitalizeBetweenPunct,
	filterChoices,
	uniformizeRecords,
} from "@dicelette/utils";
import type { EClient } from "client";
import { getFirstChar, getTemplateByInteraction, getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import {
	getLangFromInteraction,
	gmCommonOptions,
	isSerializedNameEquals,
	rollMacro,
	rollStatistique,
} from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "../tools";
import "discord_ext";

export const mjRoll = {
	data: new Djs.SlashCommandBuilder()
		.setNames("mjRoll.name")
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
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const ul = getLangFromInteraction(interaction, client);
		const transform = autofocusTransform(interaction, ul);
		if (transform) return await interaction.respond(transform);
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData || !guildData.templateID) return;
		let choices: string[] = [];
		let user = options.get(t("display.userLowercase"))?.value;
		let allCharFromGuild: {
			charName?: string | null;
			messageId: UserMessageId;
			damageName?: string[];
			isPrivate?: boolean;
		}[] = [];

		if (typeof user !== "string") user = interaction.user.id;
		if (user === interaction.user.id) {
			for (const [, char] of Object.entries(guildData.user)) {
				for (const data of char) {
					allCharFromGuild.push(data);
				}
			}
		} else allCharFromGuild = guildData.user[user];
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
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guild.id);
		const ul = ln(guildData?.lang ?? interaction.locale);
		if (!guildData) return;

		const user = options.getUser(t("display.userLowercase"), false) ?? undefined;
		const charName = options.getString(t("common.character"), false)?.toLowerCase();
		let optionChar = options.getString(t("common.character")) ?? undefined;
		let charData: undefined | UserData;
		const template = await getTemplateByInteraction(interaction, client);
		if (user) {
			charData = (
				await getUserFromInteraction(client, user.id, interaction, charName, {
					skipNotFound: true,
				})
			)?.userData;

			const serializedNameQueries = isSerializedNameEquals(charData, charName);
			if (charName && !serializedNameQueries) {
				await reply(interaction, {
					embeds: [
						embedError(
							ul("error.user.charName", { charName: charName.capitalize() }),
							ul
						),
					],
					flags: Djs.MessageFlags.Ephemeral,
				});
				return;
			}

			optionChar = charData?.userName ?? undefined;
			if (!charData && !charName) {
				const char = await getFirstChar(client, interaction, ul);
				charData = char?.userStatistique?.userData;
				optionChar = char?.optionChar;
			}
			if (!charData) {
				let userName = `<@${user.id}>`;
				if (charName) userName += ` (${charName})`;
				await reply(interaction, {
					embeds: [embedError(ul("error.user.registered", { user: userName }), ul)],
				});
				return;
			}
		} else {
			//build default char data based on the template
			if (!template) {
				await reply(interaction, {
					embeds: [
						embedError(
							ul("error.template.notFound", {
								guildId: interaction.guild.name,
							}),
							ul
						),
					],
					flags: Djs.MessageFlags.Ephemeral,
				});
				return;
			}
			charData = {
				isFromTemplate: true,
				template: {
					diceType: template.diceType,
					critical: template.critical,
					customCritical: template.customCritical,
				},
				damage: template.damage
					? (uniformizeRecords(template.damage) as Record<string, string>)
					: undefined,
			};
		}
		const hide = options.getBoolean(t("dbRoll.options.hidden.name"));
		const subcommand = options.getSubcommand(true);
		/** Should never happen
		if (allValuesUndefined(charData.template) && template && user) {
			charData.template = template;
			//update in memory
			await updateMemory(client.characters, interaction.guild.id, user.id, ul, {
				userData: charData,
			});
		}*/
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
