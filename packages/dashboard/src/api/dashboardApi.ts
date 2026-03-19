import type {
	DashboardBootstrapPayload,
	DashboardGuildPayload,
	GuildBotConfig,
} from "../types";

const API_BASE = "/api/dashboard";

async function parseJson<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `HTTP ${response.status}`);
	}
	return (await response.json()) as T;
}

export async function fetchBootstrap(userId: string) {
	const response = await fetch(
		`${API_BASE}/bootstrap?userId=${encodeURIComponent(userId)}`
	);
	return await parseJson<DashboardBootstrapPayload>(response);
}

export async function saveGuildConfig(
	guildId: string,
	config: GuildBotConfig,
	userId: string
) {
	const response = await fetch(
		`${API_BASE}/guilds/${guildId}/config?userId=${encodeURIComponent(userId)}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(config),
		}
	);
	return await parseJson<DashboardGuildPayload>(response);
}

export async function saveUserSettings(
	guildId: string,
	userId: string,
	payload: DashboardGuildPayload["userSettings"]
) {
	const response = await fetch(
		`${API_BASE}/guilds/${guildId}/user-settings/${encodeURIComponent(userId)}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}
	);
	return await parseJson<DashboardGuildPayload>(response);
}
