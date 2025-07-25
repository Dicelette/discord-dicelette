import { evalStatsDice, isNumber, roll } from "@dicelette/core";
import { parseEmbedFields } from "@dicelette/parse_result";
import type { Translation, UserMessageId, UserRegistration } from "@dicelette/types";
import { capitalizeBetweenPunct, logger } from "@dicelette/utils";
import type { EClient } from "client";
import { getUserNameAndChar, registerUser, updateMemory } from "database";
import type { TextChannel } from "discord.js";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	displayOldAndNewStats,
	getEmbeds,
	getEmbedsList,
	removeEmbedsFromList,
	reply,
	sendLogs,
} from "messages";
import { editUserButtons, selectEditMenu } from "utils";

/**
 * Validates and applies dice edits from a Discord modal interaction, updating or removing dice embeds in the message as needed.
 *
 * Parses user-submitted dice input, checks for validity against character stats, updates the message embed fields accordingly, and manages user registration and logging. If all dice are removed or invalid, the dice embed is deleted from the message.
 *
 * @throws {Error} If a dice string is invalid or cannot be evaluated against character stats.
 */
export async function validate(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	const compareUnidecode = (a: string, b: string) =>
		a.unidecode().standardize() === b.unidecode().standardize();
	const db = client.settings;
	if (!interaction.message) return;
	const message = await (interaction.channel as TextChannel).messages.fetch(
		interaction.message.id
	);
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
	const diceEmbeds = getEmbeds(ul, message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map((dice) => {
		const match = dice.match(/^([^:]+):(.*)$/s);
		if (match) {
			return {
				name: match[1].trim().replace(/^- /, "").toLowerCase(),
				value: match[2].trim(),
			};
		} //fallback for old format
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
	});
	const dices = valuesAsDice.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as Record<string, string>
	);
	const newEmbedDice: Djs.APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		if (newEmbedDice.find((field) => compareUnidecode(field.name, skill))) continue;
		if (dice === "X" || dice.trim().length === 0 || dice === "0") {
			newEmbedDice.push({
				name: skill.capitalize(),
				value: "X",
				inline: true,
			});
			continue;
		}
		const statsEmbeds = getEmbeds(ul, message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", { dice }));
			}
			continue;
		}
		const statsValues = parseStatsString(statsEmbeds);
		try {
			evalStatsDice(dice, statsValues);
		} catch (error) {
			logger.warn(error);
			throw new Error(ul("error.invalidDice.eval", { dice }));
		}
		newEmbedDice.push({
			name: skill.capitalize(),
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			const newValue = newEmbedDice.find((f) => compareUnidecode(f.name, name));
			if (!newValue) {
				//register the old value
				newEmbedDice.push({
					name: name.capitalize(),
					value: `${field.value}`,
					inline: true,
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: Djs.APIEmbedField[] = [];
	for (const field of newEmbedDice) {
		const name = field.name.toLowerCase();
		const dice = field.value;
		if (
			fieldsToAppend.find((f) => compareUnidecode(f.name, name)) ||
			dice.toLowerCase() === "x" ||
			dice.trim().length === 0 ||
			dice === "0"
		)
			continue;
		fieldsToAppend.push({
			name: capitalizeBetweenPunct(name.capitalize()),
			value: dice,
			inline: true,
		});
	}
	const diceEmbed = createDiceEmbed(ul).addFields(fieldsToAppend);
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	const messageID = [message.id, message.channelId] as UserMessageId;
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(ul, { which: "damage", embed: diceEmbed }, message);
		const toAdd = removeEmbedsFromList(embedsList.list, "damage");
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		message.edit({
			embeds: toAdd,
			components: [components, selectEditMenu(ul)],
		});
		await updateMemory(client.characters, interaction.guild!.id, userID, ul, {
			embeds: toAdd,
		});
		await reply(interaction, {
			content: ul("modals.removed.dice"),
			flags: Djs.MessageFlags.Ephemeral,
		});

		const userRegister: UserRegistration = {
			userID,
			charName: userName,
			damage: undefined,
			msgId: messageID,
		};
		await registerUser(userRegister, interaction, db, false);
		await sendLogs(
			ul("logs.dice.remove", {
				user: Djs.userMention(interaction.user.id),
				fiche: message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}
	const skillDiceName = Object.keys(
		fieldsToAppend.reduce(
			(acc, field) => {
				acc[field.name] = field.value;
				return acc;
			},
			{} as Record<string, string>
		)
	);
	const userRegister = {
		userID,
		charName: userName,
		damage: skillDiceName,
		msgId: messageID,
	};
	await registerUser(userRegister, interaction, db, false);
	const embedsList = getEmbedsList(ul, { which: "damage", embed: diceEmbed }, message);
	await message.edit({ embeds: embedsList.list });
	await reply(interaction, {
		content: ul("embed.edit.dice"),
		flags: Djs.MessageFlags.Ephemeral,
	});
	const compare = displayOldAndNewStats(diceEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.dice.edit", {
		user: Djs.userMention(interaction.user.id),
		fiche: message.url,
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	await updateMemory(client.characters, interaction.guild!.id, userID, ul, {
		embeds: embedsList.list,
	});
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Djs.Guild, db);
}

/**
 * Parse the fields in stats, used to fix combinaison and get only them and not their result
 */
function parseStatsString(statsEmbed: Djs.EmbedBuilder) {
	const stats = parseEmbedFields(statsEmbed.toJSON() as Djs.Embed);
	const parsedStats: Record<string, number> = {};
	for (const [name, value] of Object.entries(stats)) {
		let number = Number.parseInt(value, 10);
		if (!isNumber(value)) {
			const combinaison = value.replace(/`(.*)` =/, "").trim();
			number = Number.parseInt(combinaison, 10);
		}
		parsedStats[name] = number;
	}
	return parsedStats;
}
