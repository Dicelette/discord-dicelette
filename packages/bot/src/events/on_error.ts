import process from "node:process";

import { lError } from "@dicelette/localization";
import { DISCORD_ERROR_CODE, MATCH_API_ERROR, type Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { DiscordAPIError } from "@discordjs/rest";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { embedError, reply } from "messages";
import { fetchChannel } from "utils";
import { sendErrorToWebhook } from "./on_disconnect";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

export function formatErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return dedent(`## ❌ Erreur détectée
				**Message**: \`${error.message}\`
				
				**Stack trace**:
				\`\`\`
				${error.stack}
				\`\`\`
        `);
	}
	return dedent(`## ❌ Erreur inconnue
			\`\`\`
			${String(error)}
			\`\`\`
  `);
}

export function isApiError(error: unknown) {
	return (
		(error instanceof DiscordAPIError &&
			DISCORD_ERROR_CODE.includes(<number>error.code)) ||
		(error instanceof Error && MATCH_API_ERROR.test(error.stack || error.message))
	);
}

export async function sendMessageError(error: unknown, client: EClient): Promise<void> {
	if (isApiError(error)) return;
	console.error("\n", error);
	if (!process.env.OWNER_ID) return;
	const dm = await client.users.createDM(process.env.OWNER_ID);
	await dm.send({ content: formatErrorMessage(error) });
	await sendErrorToWebhook(error);
}

export default (client: EClient): void => {
	client.on("error", async (error) => {
		await sendMessageError(error, client);
	});
};

export async function interactionError(
	client: EClient,
	interaction: Djs.BaseInteraction,
	e: Error,
	ul: Translation,
	langToUse?: Djs.Locale
) {
	logger.warn(e);
	if (!interaction.guild) return;
	const msgError = lError(e as Error, interaction, langToUse);
	if (msgError.length === 0) return;
	const cause = (e as Error).cause ? ((e as Error).cause as string) : undefined;
	const embed = embedError(msgError, ul, cause);
	if (interaction.isButton() || interaction.isModalSubmit() || interaction.isCommand())
		await reply(interaction, {
			embeds: [embed],
			flags: Djs.MessageFlags.Ephemeral,
		});
	if (client.settings.has(interaction.guild.id)) {
		const db = client.settings.get(interaction.guild.id, "logs");
		if (!db) return;
		const logs = (await fetchChannel(interaction.guild!, db)) as Djs.GuildBasedChannel;
		if (logs instanceof Djs.TextChannel) {
			await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
		}
	}
}
