import { cmdLn, ln, t } from "@dicelette/localization";
import type { UserMessageId } from "@dicelette/types";
import { capitalizeBetweenPunct, filterChoices } from "@dicelette/utils";
import type { EClient } from "client";
import { getFirstChar, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import { serializeName } from "utils";
import { rollDice, rollStatistique } from "utils";
import { autoFocuseSign, autofocusTransform, calculate } from "../tools";

export const mjRoll = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("mjRoll.name"))
		.setNameLocalizations(cmdLn("mjRoll.name"))
		.setDescription(t("mjRoll.description"))
		.setDescriptionLocalizations(cmdLn("mjRoll.description"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.addSubcommand(
			(
				sub //dbRoll
			) =>
				sub
					.setName(t("dbRoll.name"))
					.setNameLocalizations(cmdLn("dbRoll.name"))
					.setDescription(t("dbRoll.description"))
					.setDescriptionLocalizations(cmdLn("dbRoll.description"))
					.addUserOption((option) =>
						option
							.setName(t("display.userLowercase"))
							.setNameLocalizations(cmdLn("display.userLowercase"))
							.setDescription(t("mjRoll.user"))
							.setDescriptionLocalizations(cmdLn("mjRoll.user"))
							.setRequired(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("common.statistic"))
							.setNameLocalizations(cmdLn("common.statistic"))
							.setDescription(t("dbRoll.options.statistic"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.statistic"))
							.setRequired(true)
							.setAutocomplete(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("common.character"))
							.setNameLocalizations(cmdLn("common.character"))
							.setDescription(t("display.character"))
							.setDescriptionLocalizations(cmdLn("display.character"))
							.setRequired(false)
							.setAutocomplete(true)
					)

					.addStringOption((option) =>
						option
							.setName(t("dbRoll.options.comments.name"))
							.setDescription(t("dbRoll.options.comments.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
							.setRequired(false)
					)
					.addStringOption((option) =>
						option
							.setName(t("dbRoll.options.override.name"))
							.setDescription(t("dbRoll.options.override.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.override.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.override.description"))
							.setRequired(false)
					)
					.addNumberOption((option) =>
						option
							.setName(t("dbRoll.options.modificator.name"))
							.setDescription(t("dbRoll.options.modificator.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
							.setDescriptionLocalizations(
								cmdLn("dbRoll.options.modificator.description")
							)
							.setRequired(false)
					)
					.addBooleanOption((option) =>
						option
							.setName(t("dbRoll.options.hidden.name"))
							.setDescription(t("dbRoll.options.hidden.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
							.setRequired(false)
					)
		)
		.addSubcommand(
			(
				sub //dbd
			) =>
				sub
					.setName(t("rAtq.name"))
					.setDescription(t("rAtq.description"))
					.setNameLocalizations(cmdLn("rAtq.name"))
					.setDescriptionLocalizations(cmdLn("rAtq.description"))
					.addUserOption((option) =>
						option
							.setName(t("display.userLowercase"))
							.setNameLocalizations(cmdLn("display.userLowercase"))
							.setDescription(t("mjRoll.user"))
							.setDescriptionLocalizations(cmdLn("mjRoll.user"))
							.setRequired(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("rAtq.atq_name.name"))
							.setNameLocalizations(cmdLn("rAtq.atq_name.name"))
							.setDescription(t("rAtq.atq_name.description"))
							.setDescriptionLocalizations(cmdLn("rAtq.atq_name.description"))
							.setRequired(true)
							.setAutocomplete(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("common.character"))
							.setNameLocalizations(cmdLn("common.character"))
							.setDescription(t("display.character"))
							.setDescriptionLocalizations(cmdLn("display.character"))
							.setRequired(false)
							.setAutocomplete(true)
					)
					.addNumberOption((option) =>
						option
							.setName(t("dbRoll.options.modificator.name"))
							.setDescription(t("dbRoll.options.modificator.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
							.setDescriptionLocalizations(
								cmdLn("dbRoll.options.modificator.description")
							)
							.setRequired(false)
					)
					.addStringOption((option) =>
						option
							.setName(t("dbRoll.options.comments.name"))
							.setDescription(t("dbRoll.options.comments.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
							.setRequired(false)
					)
					.addBooleanOption((option) =>
						option
							.setName(t("dbRoll.options.hidden.name"))
							.setDescription(t("dbRoll.options.hidden.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
							.setRequired(false)
					)
		)
		.addSubcommand(
			(
				sub //calc
			) =>
				sub
					.setName(t("calc.title"))
					.setDescription(t("calc.description"))
					.setNameLocalizations(cmdLn("calc.title"))
					.setDescriptionLocalizations(cmdLn("calc.description"))
					.addUserOption((option) =>
						option
							.setName(t("display.userLowercase"))
							.setNameLocalizations(cmdLn("display.userLowercase"))
							.setDescription(t("mjRoll.user"))
							.setDescriptionLocalizations(cmdLn("mjRoll.user"))
							.setRequired(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("common.statistic"))
							.setDescription(t("calc.statistic"))
							.setRequired(true)
							.setNameLocalizations(cmdLn("common.statistic"))
							.setDescriptionLocalizations(cmdLn("calc.statistic"))
							.setAutocomplete(true)
					)

					.addStringOption((option) =>
						option
							.setName(t("calc.sign.title"))
							.setDescription(t("calc.sign.desc"))
							.setRequired(true)
							.setNameLocalizations(cmdLn("calc.sign.title"))
							.setDescriptionLocalizations(cmdLn("calc.sign.desc"))
							.setAutocomplete(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("calc.formula.title"))
							.setDescription(t("calc.formula.desc"))
							.setRequired(true)
							.setNameLocalizations(cmdLn("calc.formula.title"))
							.setDescriptionLocalizations(cmdLn("calc.formula.desc"))
							.setRequired(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("calc.transform.title"))
							.setDescription(t("calc.transform.desc"))
							.setRequired(false)
							.setNameLocalizations(cmdLn("calc.transform.title"))
							.setDescriptionLocalizations(cmdLn("calc.transform.desc"))
							.setAutocomplete(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("common.character"))
							.setDescription(t("dbRoll.options.character"))
							.setNameLocalizations(cmdLn("common.character"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
							.setRequired(false)
							.setAutocomplete(true)
					)
					.addStringOption((option) =>
						option
							.setName(t("dbRoll.options.comments.name"))
							.setDescription(t("dbRoll.options.comments.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
							.setRequired(false)
					)
					.addBooleanOption((option) =>
						option
							.setName(t("dbRoll.options.hidden.name"))
							.setDescription(t("dbRoll.options.hidden.description"))
							.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
							.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
							.setRequired(false)
					)
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const sign = autoFocuseSign(interaction);
		if (sign) return await interaction.respond(sign);
		const transform = autofocusTransform(interaction);
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
			const skill = options.getString(t("rAtq.atq_name.name"));
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
		} else if (fixed.name === t("rAtq.atq_name.name")) {
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
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guild.id);
		const ul = ln(guildData?.lang ?? interaction.locale);
		if (!guildData) return;

		const user = options.getUser(t("display.userLowercase"), true);
		const charName = options.getString(t("common.character"), false)?.toLowerCase();
		let optionChar = options.getString(t("common.character")) ?? undefined;
		let charData = await getUserFromMessage(client, user.id, interaction, charName, {
			skipNotFound: true,
		});
		const serializedNameQueries = serializeName(charData, charName);
		if (charName && !serializedNameQueries) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.charName", { charName: charName.capitalize() }), ul),
				],
				ephemeral: true,
			});
			return;
		}
		optionChar = charData?.userName ?? undefined;
		if (!charData && !charName) {
			const char = await getFirstChar(client, interaction, ul);
			charData = char?.userStatistique;
			optionChar = char?.optionChar;
		}
		if (!charData) {
			let userName = `<@${user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}
		const hide = options.getBoolean(t("dbRoll.options.hidden.name"));
		const subcommand = options.getSubcommand(true);
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
		if (subcommand === ul("rAtq.name"))
			return await rollDice(
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
			return await calculate(options, charData, ul, interaction, client, optionChar);
	},
};
