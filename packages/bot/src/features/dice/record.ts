import { evalStatsDice } from "@dicelette/core";
import { findln } from "@dicelette/localization";
import type { Settings, Translation, UserMessageId } from "@dicelette/types";
import { capitalizeBetweenPunct, NoEmbed } from "@dicelette/utils";

import type { EClient } from "client";
import {
	getTemplateByInteraction,
	getUserByEmbed,
	getUserNameAndChar,
	registerUser,
	updateMemory,
} from "database";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	embedError,
	ensureEmbed,
	getEmbeds,
	reply,
	sendLogs,
} from "messages";
import { addAutoRole, editUserButtons, getLangAndConfig, selectEditMenu } from "utils";

/**
 * Handles a modal submit interaction to register new skill damage dice for a user.
 *
 * Allows the operation only if the interacting user is the owner referenced in the embed or has moderator permissions.
 * Replies with an error if the required template is not found or if the user lacks permission.
 */
export async function storeDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	client: EClient
) {
	if (!(await getTemplateByInteraction(interaction, client))) {
		await reply(interaction, { embeds: [embedError(ul("error.template.notFound"), ul)] });
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user =
		embed.fields
			.find((field) => findln(field.name) === "common.user")
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, client, interaction.customId.includes("first"));
	else
		await reply(interaction, {
			content: ul("modals.noPermission"),
			flags: Djs.MessageFlags.Ephemeral,
		});
}

/**
 * Button when registering the user, adding the "add dice" button
 * @param ul {Translation}
 */
export function registerDmgButton(ul: Translation) {
	const validateButton = new Djs.ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(Djs.ButtonStyle.Success);
	const cancelButton = new Djs.ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(Djs.ButtonStyle.Danger);
	const registerDmgButton = new Djs.ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("button.dice"))
		.setStyle(Djs.ButtonStyle.Primary);
	return new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents([
		registerDmgButton,
		validateButton,
		cancelButton,
	]);
}

/**
 * Registers a new skill damage dice from modal input, updating the corresponding embed and database entry.
 *
 * Handles both initial dice registration for a user and subsequent additions or edits. Updates the embed with the new dice, evaluates dice values using user stats, enforces a maximum of 25 dice, manages user roles, and updates the database and in-memory cache as needed.
 *
 * @param {Djs.ModalSubmitInteraction} interaction
 * @param {EClient} client
 * @param {boolean|undefined} first - If true, indicates this is the initial dice registration for the user; otherwise, a new dice is being added to an existing user.
 *
 * @throws {Error} If the interaction is missing a guild or message, or if the user cannot be found in the embed.
 */
export async function registerDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	client: EClient,
	first?: boolean
) {
	const db = client.settings;
	const { ul } = getLangAndConfig(db, interaction);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.guild) throw new Error(ul("error.guild.empty"));
	if (!interaction.message) throw new Error(ul("error.noMessage"));

	const oldDiceEmbeds = getEmbeds(
		ul,
		interaction.message ?? undefined,
		"damage"
	)?.toJSON();
	const diceEmbed = oldDiceEmbeds
		? new Djs.EmbedBuilder(oldDiceEmbeds)
		: createDiceEmbed(ul);
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			const newField = {
				name: capitalizeBetweenPunct(field.name),
				value: field.value,
				inline: field.inline,
			};
			//add fields only if not already in the diceEmbed
			if (
				diceEmbed
					.toJSON()
					.fields?.findIndex((f) => f.name.unidecode() === field.name.unidecode()) === -1
			) {
				diceEmbed.addFields(newField);
			}
		}
	const user = getUserByEmbed({ message: interaction.message }, ul, first);
	if (!user) throw new Error(ul("error.user.notFound")); //mean that there is no embed
	value = evalStatsDice(value, user.stats);

	if (
		diceEmbed
			.toJSON()
			.fields?.findIndex((f) => f.name.unidecode() === name.unidecode()) === -1 ||
		!diceEmbed.toJSON().fields
	) {
		diceEmbed.addFields({
			name: capitalizeBetweenPunct(name),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const damageName = diceEmbed.toJSON().fields?.reduce(
		(acc, field) => {
			acc[field.name] = field.value.removeBacktick();
			return acc;
		},
		{} as Record<string, string>
	);
	if (damageName && Object.keys(damageName).length > 25) {
		await reply(interaction, {
			content: ul("modals.dice.max"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}
	const { userID, userName } = await getUserNameAndChar(interaction, ul, first);
	await addAutoRole(
		interaction,
		userID,
		!!damageName && Object.keys(damageName).length > 0,
		false,
		db
	);
	let allEmbeds: Djs.EmbedBuilder[] = [];
	let components: (
		| Djs.ActionRowBuilder<Djs.ButtonBuilder>
		| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
	)[] = [];
	const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
	const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
	if (!userEmbed) throw new NoEmbed();
	allEmbeds = [userEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	allEmbeds.push(diceEmbed);
	const compare = first
		? undefined
		: displayOldAndNewStats(oldDiceEmbeds?.fields, diceEmbed.toJSON().fields);
	if (!first) {
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		if (templateEmbed) allEmbeds.push(templateEmbed);
		components = [editUserButtons(ul, !!statsEmbed, true), selectEditMenu(ul)];
		const userRegister: {
			userID: string;
			charName: string | undefined;
			damage: string[] | undefined;
			msgId: UserMessageId;
		} = {
			userID,
			charName: userName,
			damage: damageName ? Object.keys(damageName) : undefined,
			msgId: [interaction.message.id, interaction.message.channel.id],
		};
		await registerUser(userRegister, interaction, db, false);
		await updateMemory(client.characters, interaction.guild.id, userID, ul, {
			embeds: allEmbeds,
		});
	} else {
		components = [registerDmgButton(ul)];
	}

	await edit(
		db,
		interaction,
		ul,
		allEmbeds,
		components,
		userID,
		userName,
		compare,
		first
	);
}

async function edit(
	db: Settings,
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	allEmbeds: Djs.EmbedBuilder[],
	components: (
		| Djs.ActionRowBuilder<Djs.ButtonBuilder>
		| Djs.ActionRowBuilder<Djs.StringSelectMenuBuilder>
	)[],
	userID: string,
	userName?: string,
	compare?: string,
	first?: boolean
) {
	await interaction?.message?.edit({ embeds: allEmbeds, components });
	await reply(interaction, {
		content: ul("modals.added.dice"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	if (first) return;
	if (!compare)
		return await sendLogs(
			ul("logs.dice.add", {
				user: Djs.userMention(interaction.user.id),
				fiche: interaction.message?.url ?? "no url",
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
	const msg = ul("logs.dice.add", {
		user: Djs.userMention(interaction.user.id),
		fiche: interaction.message?.url ?? "no url",
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	return await sendLogs(`${msg}\n${compare}`, interaction.guild as Djs.Guild, db);
}
