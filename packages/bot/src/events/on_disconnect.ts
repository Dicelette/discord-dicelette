import * as Djs from "discord.js";
import type { EClient } from "../client";

export default (client: EClient): void => {
	client.on("shardDisconnect", async (event, shardId) => {
		if (!process.env.OWNER_ID) return;
		const dm = await client.users.createDM(process.env.OWNER_ID);
		await dm.send({
			content:
				"## ❌ Le bot a été déconnecté du serveur Discord.\n\n" +
				"Veuillez vérifier l'état du bot et le redémarrer si nécessaire.",
		});
		console.error(`Shard ${shardId} disconnected:`, event);
		process.exit(1); // Optionally exit the process to restart the bot by pm2
	});
};

export async function sendErrorToWebhook(error: unknown) {
	const DiscordWebhookUrl = process.env.DISCORD_WEBHOOK_URL!;
	if (!DiscordWebhookUrl) return;
	const ownerId = process.env.OWNER_ID;
	const webhookId = process.env.DISCORD_WEBHOOK_ID!;
	const webhookToken = process.env.DISCORD_WEBHOOK_TOKEN!;
	
	const webhookClient = new Djs.WebhookClient({id: webhookId, token: webhookToken});
	
	const content =
		typeof error === "string"
			? error
			: error instanceof Error
				? `<@${ownerId}> : ${error.name}: ${error.message}\n\`\`\`\n${error.stack}\n\`\`\``
				: `<@${ownerId}>\n\`\`\`json\n${JSON.stringify(error)}\n\`\`\``;
	const params = {
		username: "Dicelette - Uncaught Exception",
		avatarURL: "https://github.com/Dicelette/discord-dicelette/blob/main/assets/warning.png?raw=true"
	}
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
