/* eslint-disable @typescript-eslint/no-unused-vars */
import { error } from "@console";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { embedError, filterChoices, reply, title } from "@utils";
import { getFirstRegisteredChar, getUserFromMessage, serializeName } from "@utils/db";
import { rollDice } from "@utils/roll";
import {
	type AutocompleteInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	type Locale,
	SlashCommandBuilder,
} from "discord.js";
import i18next from "i18next";
import removeAccents from "remove-accents";

const t = i18next.getFixedT("en");

export const dbd = {
	data: new SlashCommandBuilder()
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
	async autocomplete(interaction: AutocompleteInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
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
					if (data.charName)
						return removeAccents(data.charName)
							.toLowerCase()
							.includes(removeAccents(char).toLowerCase());
					return false;
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
				const values = user.filter((data) => {
					if (data.damageName)
						return data.damageName
							.map((data) => removeAccents(data).toLowerCase())
							.includes(removeAccents(skill).toLowerCase());
					return false;
				});
				choices = values
					.map((data) => data.charName ?? "")
					.filter((data) => data.length > 0);
				if (db.templateID.damageName?.includes(skill)) {
					choices = allCharactersFromUser;
				}
			} else {
				//get user characters
				choices = allCharactersFromUser;
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: title(result), value: result }))
		);
	},
	async execute(interaction: CommandInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = client.settings.get(interaction.guild.id, `user.${interaction.user.id}`);
		if (!user) return;
		let charOptions = options.getString(t("common.character")) ?? undefined;
		const charName = charOptions ? removeAccents(charOptions).toLowerCase() : undefined;
		const ul = ln(interaction.locale as Locale);
		try {
			let userStatistique = await getUserFromMessage(
				client.settings,
				interaction.user.id,
				interaction,
				charName
			);
			const selectedCharByQueries = serializeName(userStatistique, charName);
			if (charOptions && !selectedCharByQueries) {
				await reply(interaction, {
					embeds: [
						embedError(ul("error.charName", { charName: title(charOptions) }), ul),
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
