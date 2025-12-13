import { reuploadAvatar } from "@dicelette/bot-helpers";
import type { CustomCritical, StatisticalTemplate } from "@dicelette/core";
import { findln } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import {
	BotError,
	BotErrorLevel,
	type BotErrorOptions,
	cleanAvatarUrl,
	NoEmbed,
	QUERY_URL_PATTERNS,
} from "@dicelette/utils";
import type { Embed, EmbedBuilder, Message } from "discord.js";
import * as Djs from "discord.js";

const botErrorOptions: BotErrorOptions = {
	cause: "EMBEDS",
	level: BotErrorLevel.Warning,
};

export function ensureEmbed(message?: Djs.Message) {
	const oldEmbeds = message?.embeds[0];
	if (!oldEmbeds || !oldEmbeds?.fields) throw new NoEmbed();
	return oldEmbeds;
}

export const embedError = (error: string, ul: Translation, cause?: string) => {
	const embed = new Djs.EmbedBuilder()
		.setDescription(error)
		.setColor("Red")
		.setAuthor({
			iconURL: "https://i.imgur.com/2ulUJCc.png",
			name: ul("common.error"),
		})
		.setTimestamp();
	if (cause) embed.setFooter({ text: cause });
	return embed;
};

/**
 * Create a list of embeds
 */
export function createEmbedsList(
	userDataEmbed: Djs.EmbedBuilder,
	statsEmbed?: Djs.EmbedBuilder,
	diceEmbed?: Djs.EmbedBuilder,
	templateEmbed?: Djs.EmbedBuilder
) {
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	return allEmbeds;
}

/**
 * Get the embeds from the message and replace based on the embed to replace
 * Also it returns if the embeds exists or not (useful for the buttons)
 */
export async function replaceEmbedInList(
	ul: Translation,
	embedToReplace: {
		which: "user" | "stats" | "damage" | "template";
		embed: EmbedBuilder;
	},
	message?: Message
) {
	embedToReplace.embed.setFooter(null);
	const userDataEmbed =
		embedToReplace.which === "user" ? embedToReplace.embed : getEmbeds(message, "user");
	if (!userDataEmbed) throw new NoEmbed();
	const statsEmbed =
		embedToReplace.which === "stats" ? embedToReplace.embed : getEmbeds(message, "stats");
	const diceEmbed =
		embedToReplace.which === "damage"
			? embedToReplace.embed
			: getEmbeds(message, "damage");
	const templateEmbed =
		embedToReplace.which === "template"
			? embedToReplace.embed
			: getEmbeds(message, "template");
	const { files, userDataEmbed: updatedUserDataEmbed } = await updateUserEmbedThumbnail(
		message!,
		userDataEmbed,
		ul
	);
	return {
		exists: {
			damage: !!diceEmbed,
			stats: !!statsEmbed,
			template: !!templateEmbed,
			user: !!updatedUserDataEmbed,
		},
		files,
		list: createEmbedsList(updatedUserDataEmbed, statsEmbed, diceEmbed, templateEmbed),
	};
}

export async function updateUserEmbedThumbnail(
	message: Djs.Message,
	userDataEmbed: Djs.EmbedBuilder,
	ul: Translation
) {
	let files =
		message?.attachments.map(
			(att) => new Djs.AttachmentBuilder(att.url, { name: att.name })
		) ?? [];

	const thumbnail = userDataEmbed.data.thumbnail?.url;
	if (thumbnail?.match(QUERY_URL_PATTERNS.DISCORD_CDN)) {
		const res = await reuploadAvatar(
			{
				name: thumbnail.split("?")[0].split("/").pop() ?? "avatar.png",
				url: thumbnail,
			},
			ul
		);
		userDataEmbed.setThumbnail(res.name);
		files.push(res.newAttachment);
	}
	files = Array.from(new Set(files.map((f) => f.name))).map(
		(name) => files.find((f) => f.name === name)!
	);
	return { files, userDataEmbed };
}

/**
 * Get the embeds from the message and recreate it as EmbedBuilder
 */
export function getEmbeds(
	message?: Message,
	which?: "user" | "stats" | "damage" | "template",
	allEmbeds?: EmbedBuilder[] | Embed[]
) {
	if (!allEmbeds) allEmbeds = message?.embeds;

	if (!allEmbeds) return;

	const allEmbedsJson = allEmbeds?.map((embed) => embed.toJSON()) ?? [];
	for (const embedJSON of allEmbedsJson) {
		const titleKey = findln(embedJSON.title ?? "");
		const userKeys = ["embed.user", "embed.add", "embed.old"];
		const statsKeys = ["common.statistic", "common.statistics"];
		const diceKeys = ["embed.dice", "legacy.dice", "common.macro"];
		if (userKeys.includes(titleKey) && which === "user")
			return new Djs.EmbedBuilder(embedJSON);
		if (statsKeys.includes(titleKey) && which === "stats")
			return new Djs.EmbedBuilder(embedJSON);
		if (diceKeys.includes(titleKey) && which === "damage")
			return new Djs.EmbedBuilder(embedJSON);
		if (["embed.template", "common.template"].includes(titleKey) && which === "template")
			return new Djs.EmbedBuilder(embedJSON);
	}
}

/**
 * Create the userEmbed and embedding the avatar user in the thumbnail
 * @param ul {Translation}
 * @param thumbnail {string} The avatar of the user in the server (use server profile first, after global avatar)
 * @param user
 * @param charName
 */
export function createUserEmbed(
	ul: Translation,
	thumbnail: string | null,
	user: string,
	charName?: string
) {
	const userEmbed = new Djs.EmbedBuilder()
		.setTitle(ul("embed.user"))
		.setColor("Random")
		.setThumbnail(thumbnail ? cleanAvatarUrl(thumbnail) : null)
		.addFields({
			inline: true,
			name: ul("common.user").capitalize(),
			value: `<@${user}>`,
		});
	if (charName)
		userEmbed.addFields({
			inline: true,
			name: ul("common.character").capitalize(),
			value: charName.capitalize(),
		});
	else
		userEmbed.addFields({
			inline: true,
			name: ul("common.character").capitalize(),
			value: ul("common.noSet").capitalize(),
		});
	return userEmbed;
}

/**
 * Create the statistic embed
 * @param ul {Translation}
 */
export function createStatsEmbed(ul: Translation) {
	return new Djs.EmbedBuilder()
		.setTitle(ul("common.statistics").capitalize())
		.setColor("Aqua");
}

/**
 * Create the template embed for user
 * @param ul {Translation}
 */
export function createTemplateEmbed(ul: Translation) {
	return new Djs.EmbedBuilder().setTitle(ul("embed.template")).setColor("DarkGrey");
}

/**
 * Create the dice skill embed
 * @param ul {Translation}
 */
export function createDiceEmbed(ul: Translation) {
	return new Djs.EmbedBuilder().setTitle(ul("embed.dice")).setColor("Green");
}

/**
 * Remove the footer from an EmbedBuilder by cloning its JSON data without the footer field.
 */
export function stripFooter(embed: Djs.EmbedBuilder) {
	const data = embed.toJSON() as Djs.APIEmbed;
	const { footer: _ignored, ...rest } = data;
	return new Djs.EmbedBuilder(rest);
}

/**
 * Remove the embeds from the list
 */
export function removeEmbedsFromList(
	embeds: Djs.EmbedBuilder[],
	which: "user" | "stats" | "damage" | "template"
) {
	return embeds.filter((embed) => {
		const embedTitle = embed.toJSON().title;
		if (!embedTitle) return false;
		const title = findln(embedTitle);
		switch (which) {
			case "user":
				return title !== "embed.user" && title !== "embed.add" && title !== "embed.old";
			case "stats":
				return title !== "common.statistic" && title !== "common.statistics";
			case "damage":
				return title !== "embed.dice" && title !== "common.macro";
			case "template":
				return title !== "embed.template" && title !== "common.template";
			default:
				return false;
		}
	});
}

export function createCustomCritical(
	templateEmbed: Djs.EmbedBuilder,
	criticalTemplate: Record<string, CustomCritical>
) {
	for (const [name, value] of Object.entries(criticalTemplate)) {
		const effectOnSkill = value.affectSkill ? "(S) " : "";
		const onNaturalDice = value.onNaturalDice ? "(N) " : "";
		const tags = `${effectOnSkill}${onNaturalDice}`;
		const nameCritical = `${tags}${name.capitalize()}`;
		templateEmbed.addFields({
			inline: true,
			name: nameCritical,
			value: `\`${value.sign} ${value.value}\``,
		});
	}
	return templateEmbed;
}
