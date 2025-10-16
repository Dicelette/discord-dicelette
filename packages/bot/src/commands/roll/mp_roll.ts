/**
 * Importer et éditer la commande de base roll pour qu'elle soit /r et utilisable uniquement en dm
 */

import type { EClient } from "client";
import * as Djs from "discord.js";
import { klona } from "klona";
import { diceRoll } from "./base_roll";

const copyDiceRoll = klona(diceRoll);

export const mpDiceRoll = {
	data: (copyDiceRoll.data as Djs.SlashCommandBuilder)
		.setNames("roll.mp_name")
		.setContexts(
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		return await copyDiceRoll.execute(interaction, client);
	},
};
