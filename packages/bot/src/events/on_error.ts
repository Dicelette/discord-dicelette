import process from "node:process";
import { DiscordAPIError } from "@discordjs/rest";
import type { EClient } from "client";
import dedent from "dedent";
import dotenv from "dotenv";
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

export async function sendMessageError(error: unknown, client: EClient): Promise<void> {
	const ignoreCode = [50001, 50013];
	if (error instanceof DiscordAPIError && ignoreCode.includes(<number>error.code)) return;

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
