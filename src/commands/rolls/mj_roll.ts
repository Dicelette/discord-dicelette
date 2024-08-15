import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { embedError, filterChoices, reply } from "@utils";
import { getFirstRegisteredChar, getUserFromMessage, serializeName } from "@utils/db";
import { rollDice, rollStatistique } from "@utils/roll";
import i18next from "i18next";
import * as Djs from "discord.js";

const t = i18next.getFixedT("en");

export const mjRoll = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("mjRoll.name"))
		.setNameLocalizations(cmdLn("mjRoll.name"))
		.setDescription(t("mjRoll.description"))
		.setDescriptionLocalizations(cmdLn("mjRoll.description"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.addSubcommand((sub) =>
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
						.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
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
		.addSubcommand((sub) =>
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
						.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
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
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData || !guildData.templateID) return;
		let choices: string[] = [];
		let user = options.get(t("display.userLowercase"))?.value;
		if (typeof user !== "string") user = interaction.user.id;
		if (fixed.name === t("common.character")) {
			//get ALL characters from the user
			const guildChars = guildData.user[user];
			if (!guildChars) return;
			for (const data of guildChars) {
				choices.push(data.charName ? data.charName : t("common.default"));
			}
		} else if (fixed.name === t("common.statistic")) {
			choices = guildData.templateID.statsName;
		} else if (fixed.name === t("rAtq.atq_name.name")) {
			const defaultDice = guildData.templateID.damageName;
			const guildChars = guildData.user[user];
			if (!guildChars) return;
			const character = options.getString(t("common.character"), false);
			if (character) {
				const char = guildChars.find((c) => c.charName === character);
				if (char?.damageName) {
					choices = char.damageName;
				}
			} else {
				for (const data of guildChars) {
					if (data.damageName) choices.push(...data.damageName);
				}
			}
			choices.push(...defaultDice);
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guild.id);
		const ul = ln(interaction.locale);
		if (!guildData) return;

		const user = options.getUser(t("display.userLowercase"), true);
		const charName = options.getString(t("common.character"), false)?.toLowerCase();
		let optionChar = options.getString(t("common.character")) ?? undefined;
		let charData = await getUserFromMessage(
			client.settings,
			user.id,
			interaction,
			charName,
			{ skipNotFound: true }
		);
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
			const char = await getFirstRegisteredChar(client, interaction, ul);
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
	},
};
