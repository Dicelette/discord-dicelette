import { cmdLn, ln, t } from "@dicelette/localization";
import { filterChoices } from "@dicelette/utils";
import type { EClient } from "client";
import { getFirstRegisteredChar, getUserFromMessage } from "database";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import { rollStatistique, serializeName } from "utils";

export const dbRoll = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("dbRoll.name"))
		.setNameLocalizations(cmdLn("dbRoll.name"))
		.setDescription(t("dbRoll.description"))
		.setDescriptionLocalizations(cmdLn("dbRoll.description"))
		.setDefaultMemberPermissions(0)
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
		.addStringOption((option) =>
			option
				.setName(t("dbRoll.options.override.name"))
				.setDescription(t("dbRoll.options.override.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.override.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.override.description"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("dbRoll.options.modificator.name"))
				.setDescription(t("dbRoll.options.modificator.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
				.setRequired(false)
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData || !guildData.templateID) return;
		let choices: string[] = [];

		if (focused.name === t("common.statistic")) {
			choices = guildData.templateID.statsName.filter(
				(item) => !guildData.templateID.excludedStats?.includes(item)
			);
		} else if (focused.name === t("common.character")) {
			//get user characters
			const userData = client.settings.get(
				interaction.guild!.id,
				`user.${interaction.user.id}`
			);
			if (!userData) return;
			choices = userData
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
		}
		if (!choices || choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guild.id);
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) return;
		let optionChar = options.getString(t("common.character")) ?? undefined;
		const charName = optionChar?.standardize();

		let userStatistique = await getUserFromMessage(
			client,
			interaction.user.id,
			interaction,
			charName,
			{ skipNotFound: true }
		);
		const selectedCharByQueries = serializeName(userStatistique, charName);

		if (optionChar && !selectedCharByQueries) {
			await reply(interaction, {
				embeds: [
					embedError(ul("error.charName", { charName: optionChar.capitalize() }), ul),
				],
				ephemeral: true,
			});
			return;
		}
		optionChar = userStatistique?.userName ? userStatistique.userName : undefined;
		if (!userStatistique && !charName) {
			//find the first character registered
			const char = await getFirstRegisteredChar(client, interaction, ul);
			userStatistique = char?.userStatistique;
			optionChar = char?.optionChar;
		}
		if (!userStatistique) {
			await reply(interaction, {
				embeds: [embedError(ul("error.notRegistered"), ul)],
				ephemeral: true,
			});
			return;
		}

		if (!userStatistique.stats) {
			await reply(interaction, {
				embeds: [embedError(ul("error.noStats"), ul)],
				ephemeral: true,
			});
			return;
		}
		return await rollStatistique(
			interaction,
			client,
			userStatistique,
			options,
			ul,
			optionChar
		);
	},
};
