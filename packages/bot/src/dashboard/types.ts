import type { GuildData, UserSettingsData } from "@dicelette/types";

export type DashboardAccessLevel = "admin" | "user";

export type DashboardGuildSummary = {
	id: string;
	name: string;
	icon: string;
	memberCount: number;
	permissions: DashboardAccessLevel[];
	roleLabel: string;
};

export type DashboardBootstrapPayload = {
	user: {
		id: string;
		discordTag: string;
		avatar: string;
		connected: boolean;
	};
	guilds: DashboardGuildSummary[];
	configByGuild: Record<string, GuildData>;
	userSettingsByGuild: Record<
		string,
		{
			snippets: Record<string, string>;
			attributes: Record<string, number>;
		}
	>;
};

export type DashboardGuildPayload = {
	guild: DashboardGuildSummary;
	config: GuildData;
	userSettings: UserSettingsData;
};
