import { createDiceEmbed, createStatsEmbed } from "@interactions";
import type { CharacterData } from "@interfaces/database";
import { cmdLn, findln, ln } from "@localization";
import { type EClient, logger } from "@main";
import { embedError, filterChoices, haveAccess, reply } from "@utils";
import { getDatabaseChar } from "@utils/db";
import { getEmbeds } from "@utils/parse";
import * as Djs from "discord.js";
import i18next from "i18next";
import { findChara, findLocation } from "@utils/find";

const t = i18next.getFixedT("en");

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
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		const lang = guildData.lang ?? interaction.locale;
		const ul = ln(lang);
		let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof userID !== "string") userID = interaction.user.id;
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
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
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
			const diceFields = diceEmbed?.toJSON().fields;
			const statsFields = statisticEmbed?.toJSON().fields;
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
