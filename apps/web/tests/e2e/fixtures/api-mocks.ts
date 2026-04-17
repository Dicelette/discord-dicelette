/**
 * Helpers to mock Express API responses in Playwright tests.
 *
 * Each function intercepts a route with `page.route()` and returns fake data
 * instead of calling the real server. Should be called BEFORE `page.goto()`.
 *
 * Usage example:
 *
 *   test("my test", async ({ page }) => {
 *     await mockAuthMe(page);          // simulates a logged-in user
 *     await mockGuilds(page);          // simulates server list
 *     await page.goto("/");
 *     // … assertions
 *   });
 */

import type {
	ApiCharacter,
	ApiUserConfig,
	DiscordGuild,
	DiscordUser,
} from "@dicelette/api";
import type { ApiGuildData } from "@dicelette/types";
import type { Page } from "@playwright/test";
import { en, fr } from "@shared";

// ---------------------------------------------------------------------------
// Reusable test data
// ---------------------------------------------------------------------------

export const MOCK_USER: DiscordUser = {
	id: "123456789012345678",
	username: "TestUser",
	discriminator: "0",
	avatar: null,
	// biome-ignore lint/style/useNamingConvention: Bruh bruh discord bruh
	global_name: "Test User",
};

/** Discord server where the bot is already present */
export const MOCK_GUILD: DiscordGuild = {
	id: "987654321098765432",
	name: "Test Server",
	icon: null,
	owner: true,
	permissions: "2147483647",
	botPresent: true,
	isAdmin: true,
};

/** Discord server where the bot is NOT present (to test the "Add" button) */
export const MOCK_GUILD_NO_BOT: DiscordGuild = {
	...MOCK_GUILD,
	id: "111111111111111112",
	name: "Server Without Bot",
	botPresent: false,
	owner: true,
};

/** Minimal character sheet */
export const MOCK_CHARACTER: ApiCharacter = {
	charName: "Aragorn",
	messageId: "msg123456789",
	channelId: "chan987654321",
	discordLink: `https://discord.com/channels/${MOCK_GUILD.id}/chan987654321/msg123456789`,
	canLink: true,
	isPrivate: false,
	avatar: null,
	stats: [
		{ name: "STR", value: "18" },
		{ name: "DEX", value: "14" },
	],
	damage: [{ name: "Sword", value: "1d8+3" }],
};

// ---------------------------------------------------------------------------
// Authentication mocks
// ---------------------------------------------------------------------------

/**
 * Simulates an authenticated user.
 * Intercepts GET /api/auth/me and returns `user` (MOCK_USER by default).
 */
export async function mockAuthMe(page: Page, user: DiscordUser = MOCK_USER) {
	await page.route("**/api/auth/me", (route) => route.fulfill({ json: user }));
}

/**
 * Simulates a NON-logged-in user.
 * Intercepts GET /api/auth/me and returns 401.
 * The application then automatically redirects to /login.
 */
export async function mockAuthNotLoggedIn(page: Page) {
	await page.route("**/api/auth/me", (route) =>
		route.fulfill({ status: 401, json: { error: "Unauthorized" } })
	);
}

// ---------------------------------------------------------------------------
// Guild mocks
// ---------------------------------------------------------------------------

/**
 * Simulates the list of user's Discord servers.
 * Intercepts GET /api/auth/guilds.
 */
export async function mockGuilds(page: Page, guilds: DiscordGuild[] = [MOCK_GUILD]) {
	await page.route("**/api/auth/guilds", (route) => route.fulfill({ json: guilds }));
}

/**
 * Simulates the guild cache refresh endpoint.
 * Intercepts POST /api/auth/guilds/refresh.
 */
export async function mockRefreshGuilds(page: Page) {
	await page.route("**/api/auth/guilds/refresh", (route) =>
		route.fulfill({ json: { ok: true } })
	);
}

/**
 * Simulates the bot's invitation URL for a given server.
 * Intercepts GET /api/guilds/:guildId/invite.
 */
export async function mockInviteUrl(page: Page, guildId: string = MOCK_GUILD_NO_BOT.id) {
	await page.route(`**/api/guilds/${guildId}/invite`, (route) =>
		route.fulfill({
			json: { url: "https://discord.com/oauth2/authorize?client_id=test&scope=bot" },
		})
	);
}

// ---------------------------------------------------------------------------
// Guild configuration mocks
// ---------------------------------------------------------------------------

/**
 * Simulates a server's configuration (admin only).
 * Intercepts GET /api/guilds/:guildId/config.
 */
export async function mockGuildConfig(
	page: Page,
	guildId: string = MOCK_GUILD.id,
	config: Partial<ApiGuildData> = { lang: "en", disableThread: false }
) {
	await page.route(`**/api/guilds/${guildId}/config`, (route) =>
		route.fulfill({ json: config })
	);
}

/**
 * Simulates the list of server channels (used by the admin form).
 * Intercepts GET /api/guilds/:guildId/channels.
 */
export async function mockGuildChannels(page: Page, guildId: string = MOCK_GUILD.id) {
	await page.route(`**/api/guilds/${guildId}/channels`, (route) =>
		route.fulfill({ json: [] })
	);
}

/**
 * Simulates the list of server roles (used by the admin form).
 * Intercepts GET /api/guilds/:guildId/roles.
 */
export async function mockGuildRoles(page: Page, guildId: string = MOCK_GUILD.id) {
	await page.route(`**/api/guilds/${guildId}/roles`, (route) =>
		route.fulfill({ json: [] })
	);
}

// ---------------------------------------------------------------------------
// User configuration mocks
// ---------------------------------------------------------------------------

/**
 * Simulates the user's personal configuration on a server.
 * Intercepts GET /api/guilds/:guildId/user-config.
 *
 * @param page
 * @param guildId
 * @param data  - `isAdmin: true` → Admin and Template tabs are displayed.
 *              - `isAdmin: false` → only User and Characters tabs are displayed.
 */
export async function mockUserConfig(
	page: Page,
	guildId: string = MOCK_GUILD.id,
	data: ApiUserConfig = { isAdmin: true, userConfig: null, isStrictAdmin: false }
) {
	await page.route(`**/api/guilds/${guildId}/user-config`, (route) =>
		route.fulfill({ json: data })
	);
}

// ---------------------------------------------------------------------------
// Character mocks
// ---------------------------------------------------------------------------

/**
 * Simulates the list of user's characters on a server.
 * Intercepts GET /api/guilds/:guildId/characters.
 */
export async function mockCharacters(
	page: Page,
	guildId: string = MOCK_GUILD.id,
	characters: ApiCharacter[] = [MOCK_CHARACTER]
) {
	await page.route(`**/api/guilds/${guildId}/characters`, (route) =>
		route.fulfill({ json: characters })
	);
}

/**
 * Simulates the total number of characters registered on a server.
 * Intercepts GET /api/guilds/:guildId/characters/count.
 */
export async function mockCharactersCount(
	page: Page,
	guildId: string = MOCK_GUILD.id,
	count = 1
) {
	await page.route(`**/api/guilds/${guildId}/characters/count`, (route) =>
		route.fulfill({ json: { count } })
	);
}

// ---- Language mock, not really an i18n because we're not testing that here, just the presence of certain strings based on language config. ----

export const languages = {
	en: en,
	fr: fr,
} as const;
