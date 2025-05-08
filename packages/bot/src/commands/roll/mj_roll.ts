import { cmdLn, ln, t } from "@dicelette/localization";
import type { UserMessageId } from "@dicelette/types";
import { capitalizeBetweenPunct, filterChoices } from "@dicelette/utils";
import type { EClient } from "client";
import { getFirstChar, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import { gmCommonOptions, rollDice, rollStatistique, serializeName } from "utils";
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
				gmCommonOptions(sub, "dbroll")
					.setName(t("dbRoll.name"))
					.setNameLocalizations(cmdLn("dbRoll.name"))
					.setDescription(t("dbRoll.description"))
					.setDescriptionLocalizations(cmdLn("dbRoll.description"))
		)
		.addSubcommand(
			(
				sub //dbd
			) =>
				gmCommonOptions(sub, "dbd")
					.setName(t("rAtq.name"))
					.setDescription(t("rAtq.description"))
					.setNameLocalizations(cmdLn("rAtq.name"))
					.setDescriptionLocalizations(cmdLn("rAtq.description"))
		)
		.addSubcommand(
			(
				sub //calc
			) =>
				gmCommonOptions(sub, "calc")
					.setName(t("calc.title"))
					.setDescription(t("calc.description"))
					.setNameLocalizations(cmdLn("calc.title"))
					.setDescriptionLocalizations(cmdLn("calc.description"))
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
					embedError(ul("error.user.charName", { charName: charName.capitalize() }), ul),
				],
				flags: Djs.MessageFlags.Ephemeral,
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
				embeds: [embedError(ul("error.user.registered", { user: userName }), ul)],
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
			return await calculate(
				options,
				charData,
				ul,
				interaction,
				client,
				optionChar,
				hide,
				user
			);
	},
};
