import { MATCH_API_ERROR } from "@dicelette/types";
import { sentry } from "@dicelette/utils";
import * as Djs from "discord.js";
import type { EClient } from "../client";

export default (client: EClient): void => {
	client.on("shardDisconnect", async (event, shardId) => {
		if (process.env.OWNER_ID) {
			const dm = await client.users.createDM(process.env.OWNER_ID);
			await dm.send({
				content:
					"## ❌ Le bot a été déconnecté du serveur Discord.\n\n" +
					"Veuillez vérifier l'état du bot et le redémarrer si nécessaire.",
			});
		}
		await sendErrorToWebhook(`Shard disconnected: ${event.toString()}`);
		console.error(`Shard ${shardId} disconnected:`, event);
		sentry.error(`Shard ${shardId} disconnected`, { event, shardId });
		process.exit(1); // Optionally exit the process to restart the bot by pm2
	});
};

export async function sendErrorToWebhook(error: unknown) {
	if (error instanceof Error && MATCH_API_ERROR.test(error.stack || error.message))
		return;
	const ownerId = process.env.OWNER_ID;
	const webhookUrl = process.env.WEBHOOK_URL;
	if (!ownerId || !webhookUrl) {
		console.error("Owner ID or Webhook URL is not set in environment variables.");
		sentry.error("Owner ID or Webhook URL is not set in environment variables.");
		return;
	}
	const [webhookId, webhookToken] = webhookUrl.split("/").slice(-2);

	const webhookClient = new Djs.WebhookClient({ id: webhookId, token: webhookToken });

	const content =
		typeof error === "string"
			? error
			: error instanceof Error
				? `<@${ownerId}> : ${error.name}: ${error.message}\n\`\`\`\n${error.stack}\n\`\`\``
				: `<@${ownerId}>\n\`\`\`json\n${JSON.stringify(error)}\n\`\`\``;
	const params = {
		avatarURL:
			"https://github.com/Dicelette/discord-dicelette/blob/main/assets/warning.png?raw=true",
		username: "Dicelette - Uncaught Exception",
	};
	if (content.length > 2000) {
		for (let i = 0; i < content.length; i += 2000) {
			await webhookClient.send({
				content: content.slice(i, i + 2000),
				...params,
			});
		}
	} else {
		await webhookClient.send({
			content: content,
			...params,
		});
	}
}
