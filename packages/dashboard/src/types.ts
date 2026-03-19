export type AccessLevel = "admin" | "user";

export type GuildSummary = {
	id: string;
	name: string;
	icon: string;
	memberCount: number;
	permissions: AccessLevel[];
	roleLabel: string;
};

export type TemplateConfig = {
	channelId: string;
	messageId: string;
	statsName: string[];
	excludedStats: string[];
	damageName: string[];
	valid?: boolean;
};

export type GuildBotConfig = {
	lang: "fr" | "en-US";
	logs?: string;
	rollChannel?: string;
	disableThread: boolean;
	hiddenRoll: boolean | string;
	managerId?: string;
	privateChannel?: string;
	deleteAfter: number;
	timestamp: boolean;
	context: boolean;
	linkToLogs: boolean;
	allowSelfRegister: boolean;
	sortOrder: "asc" | "desc" | "none";
	pity?: number;
	autoRole: {
		dice?: string;
		stats?: string;
	};
	templateID: TemplateConfig;
	stripOOC: {
		regex: string;
		forwardId: string;
		threadMode: boolean;
		timer: number;
		categoryId: string[];
	};
};

export type UserProfile = {
	discordTag: string;
	avatar: string;
	connected: boolean;
	id: string;
};

export type SnippetRecord = Record<string, string>;
export type AttributeRecord = Record<string, number>;

export type DashboardState = {
	user: UserProfile;
	guilds: GuildSummary[];
	configByGuild: Record<string, GuildBotConfig>;
	snippetsByGuild: Record<string, SnippetRecord>;
	attributesByGuild: Record<string, AttributeRecord>;
};

export type DashboardGuildPayload = {
	guild: GuildSummary;
	config: GuildBotConfig;
	userSettings: {
		snippets: SnippetRecord;
		attributes: AttributeRecord;
	};
};

export type DashboardBootstrapPayload = {
	user: UserProfile;
	guilds: GuildSummary[];
	configByGuild: Record<string, GuildBotConfig>;
	userSettingsByGuild: Record<
		string,
		{
			snippets: SnippetRecord;
			attributes: AttributeRecord;
		}
	>;
};
