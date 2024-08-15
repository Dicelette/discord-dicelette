/* eslint-disable @typescript-eslint/no-unused-vars */
import { error } from "@console";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { embedError, filterChoices, reply } from "@utils";
import { getFirstRegisteredChar, getUserFromMessage, serializeName } from "@utils/db";
import { rollDice } from "@utils/roll";
import * as Djs from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");

export const dbd = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("rAtq.name"))
		.setDescription(t("rAtq.description"))
		.setNameLocalizations(cmdLn("rAtq.name"))
		.setDescriptionLocalizations(cmdLn("rAtq.description"))
		.setDefaultMemberPermissions(0)
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
				.setDescription(t("dbRoll.options.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
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
		),
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !db.templateID) return;
		const user = client.settings.get(
			interaction.guild!.id,
			`user.${interaction.user.id}`
		);
		if (!user) return;
		let choices: string[] = [];
		if (focused.name === t("rAtq.atq_name.name")) {
			const char = options.getString(t("common.character"));

			if (char) {
				const values = user.find((data) => {
					return data.charName?.subText(char);
				});
				if (values?.damageName) choices = values.damageName;
			} else {
				for (const [, value] of Object.entries(user)) {
					if (value.damageName) choices = choices.concat(value.damageName);
				}
			}
			if (db.templateID.damageName && db.templateID.damageName.length > 0)
				choices = choices.concat(db.templateID.damageName);
		} else if (focused.name === t("common.character")) {
			//if dice is set, get all characters that have this dice
			const skill = options.getString(t("rAtq.atq_name.name"));
			const allCharactersFromUser = user
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
			if (skill) {
				if (
					db.templateID.damageName
						?.map((x) => x.standardize())
						.includes(skill.standardize())
				) {
					choices = allCharactersFromUser;
				} else {
					const values = user.filter((data) => {
						if (data.damageName)
							return data.damageName
								.map((data) => data.standardize())
								.includes(skill.standardize());
						return false;
					});
					choices = values
						.map((data) => data.charName ?? t("common.default"))
						.filter((data) => data.length > 0);
				}
			} else {
				//get user characters
				choices = allCharactersFromUser;
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = client.settings.get(interaction.guild.id, `user.${interaction.user.id}`);
		if (!user) return;
		let charOptions = options.getString(t("common.character")) ?? undefined;
		const charName = charOptions?.normalize();
		const ul = ln(interaction.locale as Djs.Locale);
		try {
			let userStatistique = await getUserFromMessage(
				client.settings,
				interaction.user.id,
				interaction,
				charName,
				{ skipNotFound: true }
			);
			const selectedCharByQueries = serializeName(userStatistique, charName);
			if (charOptions && !selectedCharByQueries) {
				await reply(interaction, {
					embeds: [
						embedError(ul("error.charName", { charName: charOptions.capitalize() }), ul),
					],
					ephemeral: true,
				});
				return;
			}
			charOptions = userStatistique?.userName ? userStatistique.userName : undefined;
			if (!userStatistique && !charName) {
				const char = await getFirstRegisteredChar(client, interaction, ul);
				userStatistique = char?.userStatistique;
				charOptions = char?.optionChar ?? undefined;
			}
			if (!userStatistique) {
				await reply(interaction, {
					embeds: [embedError(ul("error.notRegistered"), ul)],
					ephemeral: true,
				});
				return;
			}
			if (!userStatistique.damage) {
				await reply(interaction, {
					embeds: [embedError(ul("error.emptyDamage"), ul)],
					ephemeral: true,
				});
				return;
			}
			return await rollDice(
				interaction,
				client,
				userStatistique,
				options,
				ul,
				charOptions
			);
		} catch (e) {
			error(e);
			await reply(interaction, {
				content: t("error.generic.e", { e: e as Error }),
				ephemeral: true,
			});
			return;
		}
	},
};
