import type { Settings } from "@dicelette/types";
import { important } from "@dicelette/utils";
import type { BotChannels } from "../types";

export async function sendDashboardLog(
	message: string,
	guildId: string,
	settings: Settings,
	botChannels: BotChannels
): Promise<void> {
	const channelId = settings.get(guildId, "logs");
	if (!channelId) return;
	try {
		await botChannels.sendMessage(channelId as string, message);
	} catch (error) {
		important.warn(
			`[dashboard] failed to send log to channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
