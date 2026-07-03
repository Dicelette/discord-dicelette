import process from "node:process";
import type { EClient } from "@dicelette/client";
import { fetchChannel } from "@dicelette/helpers";
import { lError } from "@dicelette/localization";
import { DISCORD_ERROR_CODE, MATCH_API_ERROR, type Translation } from "@dicelette/types";
import { type BotError, consoleError, important, sentry } from "@dicelette/utils";
import { DiscordAPIError } from "@discordjs/rest";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { embedError, reply } from "messages";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });

export function isApiError(error: unknown) {
	return (
		(error instanceof DiscordAPIError &&
			DISCORD_ERROR_CODE.includes(<number>error.code)) ||
		(error instanceof Error && MATCH_API_ERROR.test(error.stack || error.message))
	);
}

export default (client: EClient): void => {
	client.on("error", (error) => {
		important.error(error);
		sentry.error(error);
	});
};

export async function interactionError(
	client: EClient,
	interaction: Djs.BaseInteraction,
	e: BotError | Error,
	ul: Translation,
	langToUse?: Djs.Locale
) {
	const isUnknownInteractionError = e instanceof Djs.DiscordAPIError && e.code === 10062;
	if (!e.name.includes("Invalid_Dice_Type") && !isUnknownInteractionError) {
		sentry.error(e);
		consoleError(e);
	}
	if (!interaction.guild) return;
	if (client.settings.has(interaction.guild.id)) {
		const db = client.settings.get(interaction.guild.id, "logs");
		if (!db) return;
		const logs = (await fetchChannel(interaction.guild!, db)) as Djs.GuildBasedChannel;
		if (logs instanceof Djs.TextChannel) {
			await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
		}
	}

	if (
		(interaction.isButton() || interaction.isModalSubmit() || interaction.isCommand()) &&
		(interaction.replied || interaction.deferred)
	)
		return;
	const msgError = lError(e as Error, interaction, langToUse);
	if (msgError.length === 0) return;
	const cause = (e as Error).cause ? ((e as Error).cause as string) : undefined;
	const embed = embedError(msgError, ul, cause);
	if (interaction.isButton() || interaction.isModalSubmit() || interaction.isCommand()) {
		try {
			await reply(interaction, {
				embeds: [embed],
				flags: Djs.MessageFlags.Ephemeral,
			});
		} catch (e) {
			void sendErrorToDM(e as Error, langToUse ?? Djs.Locale.EnglishUS, interaction.user);
		}
	}
}

export async function sendErrorToDM(e: Error, userLang: Djs.Locale, author: Djs.User) {
	const msgError = lError(e, undefined, userLang);
	if (msgError.length === 0) return;
	try {
		await author.send({ content: msgError });
	} catch (dmError) {
		if (!isApiError(dmError)) consoleError(dmError as Error);
	}
}
