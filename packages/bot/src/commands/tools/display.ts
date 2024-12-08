import { generateStatsDice } from "@dicelette/core";
import { cmdLn, findln, t } from "@dicelette/localization";
import type { CharacterData } from "@dicelette/types";
import { filterChoices, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { findChara, getDatabaseChar } from "database";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	createStatsEmbed,
	embedError,
	findLocation,
	getEmbeds,
	reply,
} from "messages";
import { autoComplete, haveAccess, optionInteractions } from "utils";

export const displayUser = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("display.title"))
		.setDescription(t("display.description"))
		.setNameLocalizations(cmdLn("display.title"))
		.setDefaultMemberPermissions(0)
		.setDescriptionLocalizations(cmdLn("display.description"))
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("display.user"))
				.setDescriptionLocalizations(cmdLn("display.user"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescription(t("display.character"))
				.setDescriptionLocalizations(cmdLn("display.character"))
				.setRequired(false)
				.setAutocomplete(true)
		),
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const param = autoComplete(interaction, client);
		if (!param) return;
		const { fixed, guildData, userID, ul, choices } = param;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user?.[userID];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = haveAccess(interaction, data.messageId[1], userID);
				const toPush = data.charName ? data.charName : ul("common.default");
				if (!data.isPrivate) choices.push(toPush);
				else if (allowed) choices.push(toPush);
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const int = await optionInteractions(interaction, client);
		if (!int) return;
		const { options, user, ul } = int;
		const charData = await getDatabaseChar(interaction, client, t, false);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}

		let userData: CharacterData | undefined = charData?.[user?.id ?? interaction.user.id];
		if (!userData) userData = await findChara(charData, charName);
		if (!userData) {
			await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
			return;
		}
		const { thread, sheetLocation } = await findLocation(
			userData,
			interaction,
			client,
			ul,
			charData,
			user
		);

		try {
			const userMessage = await thread?.messages.fetch(sheetLocation.messageId);
			const statisticEmbed = getEmbeds(ul, userMessage, "stats");
			const diceEmbed = getEmbeds(ul, userMessage, "damage");
			const statsFields = statisticEmbed?.toJSON().fields;
			const diceFields = generateDice(diceEmbed?.toJSON().fields, statsFields);
			const dataUserEmbeds = getEmbeds(ul, userMessage, "user");
			if (!statisticEmbed && !diceEmbed && !diceFields && !statsFields) {
				await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
				return;
			}
			const jsonDataUser = dataUserEmbeds!
				.toJSON()
				.fields!.find((x) => findln(x.name) === findln("common.user"));
			const jsonDataChar = dataUserEmbeds!
				.toJSON()
				.fields!.find((x) => findln(x.name) === findln("common.character"));
			const displayEmbed = new Djs.EmbedBuilder()
				.setTitle(ul("embed.display"))
				.setThumbnail(
					dataUserEmbeds?.toJSON().thumbnail?.url ??
						user?.displayAvatarURL() ??
						interaction.user.displayAvatarURL()
				)
				.setColor("Gold")
				.addFields({
					name: ul("common.user"),
					value: jsonDataUser?.value ?? `<@${user?.id ?? interaction.user.id}>`,
					inline: true,
				})
				.addFields({
					name: ul("common.character").capitalize(),
					value:
						jsonDataChar?.value ?? userData.charName?.capitalize() ?? ul("common.noSet"),
					inline: true,
				});
			const newStatEmbed: Djs.EmbedBuilder | undefined = statsFields
				? createStatsEmbed(ul).addFields(keepResultOnlyInFormula(statsFields))
				: undefined;
			const newDiceEmbed = diceFields
				? createDiceEmbed(ul).addFields(diceFields)
				: undefined;
			const displayEmbeds: Djs.EmbedBuilder[] = [displayEmbed];
			if (newStatEmbed) displayEmbeds.push(newStatEmbed);
			if (newDiceEmbed) displayEmbeds.push(newDiceEmbed);
			await reply(interaction, { embeds: displayEmbeds });
		} catch (e) {
			logger.error(e);
			await reply(interaction, { embeds: [embedError(ul("error.noMessage"), ul)] });
			return;
		}
	},
};

function keepResultOnlyInFormula(fields: Djs.APIEmbedField[]) {
	const newFields: Djs.APIEmbedField[] = [];
	for (const field of fields) {
		let value = field.value as string;
		if (value.includes("= ")) {
			value = `\`${value.split("= ")[1]}\``;
		}
		newFields.push({ ...field, value });
	}
	return newFields;
}

function generateDice(fields?: Djs.APIEmbedField[], statsFields?: Djs.APIEmbedField[]) {
	if (!fields) return;
	const stats = statsFields?.reduce(
		(acc, field) => {
			const stat = field.name.toLowerCase();
			const value = Number.parseInt(field.value.removeBacktick() as string);
			if (stat && value) acc[field.name.standardize()] = value;
			return acc;
		},
		{} as Record<string, number>
	);
	for (const field of fields) {
		const dice = generateStatsDice(field.value.standardize() as string, stats);
		if (dice) field.value = `\`${dice}\``;
	}
	return fields;
}
