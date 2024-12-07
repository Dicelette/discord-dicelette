import { evalStatsDice } from "@dicelette/core";
import { findln, ln } from "@dicelette/localization";
import type { UserMessageId } from "@dicelette/types";
import type { Settings, Translation } from "@dicelette/types";
import { NoEmbed } from "@dicelette/utils";
import {
	getTemplateWithDB,
	getUserByEmbed,
	getUserNameAndChar,
	registerUser,
} from "database";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	embedError,
	ensureEmbed,
	getEmbeds,
	reply,
	sendLogs,
} from "messages";
import { addAutoRole, editUserButtons } from "utils";

/**
 * Interaction to submit the new skill dice
 * Only works if the user is the owner of the user registered in the embed or if the user is a moderator
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param db
 */
export async function storeDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
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
		await registerDamageDice(interaction, db, interaction.customId.includes("first"));
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
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
 * Register the new skill dice in the embed and database
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param db
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function registerDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	db: Settings,
	first?: boolean
) {
	const lang = db.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.guild) throw new Error(ul("error.noGuild"));
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
			//add fields only if not already in the diceEmbed
			if (
				diceEmbed
					.toJSON()
					.fields?.findIndex((f) => f.name.unidecode() === field.name.unidecode()) === -1
			) {
				diceEmbed.addFields(field);
			}
		}
	const user = getUserByEmbed(interaction.message, ul, first);
	if (!user) throw new Error(ul("error.user")); //mean that there is no embed
	value = evalStatsDice(value, user.stats);

	if (
		diceEmbed
			.toJSON()
			.fields?.findIndex((f) => f.name.unidecode() === name.unidecode()) === -1 ||
		!diceEmbed.toJSON().fields
	) {
		diceEmbed.addFields({
			name: name.capitalize(),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const damageName = diceEmbed.toJSON().fields?.reduce(
		(acc, field) => {
			acc[field.name] = field.value.removeBacktick();
			return acc;
		},
		{} as { [name: string]: string }
	);
	if (damageName && Object.keys(damageName).length > 25) {
		await reply(interaction, { content: ul("modals.dice.max"), ephemeral: true });
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
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new NoEmbed(); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul, !!statsEmbed, true);

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
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });
		await sendLogs(
			ul("logs.dice.add", {
				user: Djs.userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}

	const components = registerDmgButton(ul);
	const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
	if (!userEmbed) throw new NoEmbed(); //mean that there is no embed
	const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
	const allEmbeds = [userEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	allEmbeds.push(diceEmbed);
	await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
	await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });

	await sendLogs(
		ul("logs.dice.add", {
			user: Djs.userMention(interaction.user.id),
			fiche: interaction.message.url,
			char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
		}),
		interaction.guild as Djs.Guild,
		db
	);
	return;
}
