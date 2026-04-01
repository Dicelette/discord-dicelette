import type { EClient } from "@dicelette/client";
import { generateStatsDice } from "@dicelette/core";
import {
	autoCompleteEdit,
	charUserOptions,
	fetchAvatarUrl,
	haveAccess,
	reuploadAvatar,
} from "@dicelette/helpers";
import { findln, t } from "@dicelette/localization";
import { type CharacterData, MIN_THRESHOLD_MATCH } from "@dicelette/types";
import { logger, sentry } from "@dicelette/utils";
import { findChara, getRecordChar } from "database";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	createStatsEmbed,
	embedError,
	findLocation,
	getEmbeds,
	reply,
} from "messages";
import { optionInteractions } from "utils";

import "@dicelette/discord_ext";
import { cleanAvatarUrl, QUERY_URL_PATTERNS } from "@dicelette/utils";

export const displayUser = {
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		await autoCompleteEdit(interaction, client);
	},
	data: (charUserOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("display.title")
		.setDescriptions("display.description")
		.setDefaultMemberPermissions(0)
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.addBooleanOption((input) =>
			input
				.setName(t("display.persistant.name"))
				.setDescription(t("display.persistant.description"))
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		await interaction.deferReply();
		const int = await optionInteractions(interaction, client);
		if (!int) return;
		const { options, user, ul } = int;
		const charData = await getRecordChar(interaction, client, t, false);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		const persist = options.getBoolean(t("display.persistant.name")) ?? false;
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.user.registered", { user: userName }), ul)],
			});
			return;
		}

		let userData: CharacterData | undefined = charData?.[user?.id ?? interaction.user.id];
		if (userData && !userData.userId) userData.userId = user?.id ?? interaction.user.id;
		if (!userData) userData = findChara(charData, charName);
		if (!userData) {
			await reply(interaction, {
				embeds: [embedError(ul("error.user.notFound.generic"), ul)],
			});
			return;
		}

		if (userData.isPrivate) {
			logger.trace(
				"userData.isPrivate",
				userData.isPrivate,
				" sheet of ",
				userData?.userId
			);
			const allowed = await haveAccess(
				interaction,
				userData.messageId[1],
				userData.userId ?? user?.id ?? interaction.user.id
			);
			logger.trace(
				`User ${user?.id ?? interaction.user.id} access to private data: ${allowed}`
			);
			if (!allowed)
				return await reply(interaction, {
					embeds: [embedError(ul("error.private"), ul)],
				});
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
			const statisticEmbed = getEmbeds(userMessage, "stats");
			const diceEmbed = getEmbeds(userMessage, "damage");
			const statsFields = statisticEmbed?.data.fields;
			const diceFields = generateDice(diceEmbed?.data.fields, statsFields);
			const dataUserEmbeds = getEmbeds(userMessage, "user");
			if (!statisticEmbed && !diceEmbed && !diceFields && !statsFields) {
				await reply(interaction, {
					embeds: [embedError(ul("error.user.notFound.generic"), ul)],
				});
				return;
			}
			const jsonDataUser = dataUserEmbeds!.data.fields!.find(
				(x) => findln(x.name) === findln("common.user")
			);
			const jsonDataChar = dataUserEmbeds!.data.fields!.find(
				(x) => findln(x.name) === findln("common.character")
			);
			const thumbnailJson = dataUserEmbeds?.data.thumbnail?.url;
			const files = [];
			let avatar = thumbnailJson
				? cleanAvatarUrl(thumbnailJson)
				: await fetchAvatarUrl(interaction.guild!, user ?? interaction.user);
			if (persist && thumbnailJson?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
				//get the attachment if exists
				const result = await reuploadAvatar(
					{
						name: thumbnailJson.split("?")[0].split("/").pop() ?? "avatar.png",
						url: thumbnailJson,
					},
					ul
				);
				avatar = result.name;
				files.push(result.newAttachment);
			}
			const displayEmbed = new Djs.EmbedBuilder()
				.setTitle(ul("embed.display"))
				.setThumbnail(avatar)
				.setColor("Gold")
				.addFields({
					inline: true,
					name: ul("common.user"),
					value: jsonDataUser?.value ?? `<@${user?.id ?? interaction.user.id}>`,
				})
				.addFields({
					inline: true,
					name: ul("common.character").capitalize(),
					value:
						jsonDataChar?.value ?? userData.charName?.capitalize() ?? ul("common.noSet"),
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
			await reply(interaction, { embeds: displayEmbeds, files });
		} catch (e) {
			console.error(e);
			sentry.error(e, { source: "display-command" });
			await reply(interaction, {
				embeds: [embedError(ul("error.user.notFound.generic"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
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
			const value = Number.parseInt(field.value.removeBacktick() as string, 10);
			if (stat && value) acc[field.name.standardize()] = value;
			return acc;
		},
		{} as Record<string, number>
	);
	for (const field of fields) {
		const dice = generateStatsDice(
			field.value.standardize() as string,
			stats,
			MIN_THRESHOLD_MATCH
		);
		if (dice) field.value = `\`${dice}\``;
	}
	return fields;
}
