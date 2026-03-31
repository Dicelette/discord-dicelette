/**
 * Helpers pour mocker les réponses de l'API Express dans les tests Playwright.
 *
 * Chaque fonction intercepte une route avec `page.route()` et renvoie des données
 * fictives au lieu d'appeler le vrai serveur. À appeler AVANT `page.goto()`.
 *
 * Exemple d'utilisation :
 *
 *   test("mon test", async ({ page }) => {
 *     await mockAuthMe(page);          // simule un utilisateur connecté
 *     await mockGuilds(page);          // simule la liste de serveurs
 *     await page.goto("/");
 *     // … assertions
 *   });
 */

import type {
	ApiCharacter,
	ApiUserConfig,
	DiscordGuild,
	DiscordUser,
} from "@dicelette/dashboard-api";
import type { ApiGuildData } from "@dicelette/types";
import type { Page } from "@playwright/test";
import { en, fr } from "@shared";

// ---------------------------------------------------------------------------
// Données de test réutilisables
// ---------------------------------------------------------------------------

export const MOCK_USER: DiscordUser = {
	id: "123456789012345678",
	username: "TestUser",
	discriminator: "0",
	avatar: null,
	// biome-ignore lint/style/useNamingConvention: Bruh bruh discord bruh
	global_name: "Test User",
};

/** Serveur Discord où le bot est déjà présent */
export const MOCK_GUILD: DiscordGuild = {
	id: "987654321098765432",
	name: "Test Server",
	icon: null,
	owner: true,
	permissions: "2147483647",
	botPresent: true,
};

/** Serveur Discord où le bot N'est PAS présent (pour tester le bouton "Ajouter") */
export const MOCK_GUILD_NO_BOT: DiscordGuild = {
	...MOCK_GUILD,
	id: "111111111111111112",
	name: "Server Without Bot",
	botPresent: false,
	owner: true,
};

/** Fiche de personnage minimaliste */
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
// Mocks d'authentification
// ---------------------------------------------------------------------------

/**
 * Simule un utilisateur authentifié.
 * Intercepte GET /api/auth/me et renvoie `user` (MOCK_USER par défaut).
 */
export async function mockAuthMe(page: Page, user: DiscordUser = MOCK_USER) {
	await page.route("**/api/auth/me", (route) => route.fulfill({ json: user }));
}

/**
 * Simule un utilisateur NON connecté.
 * Intercepte GET /api/auth/me et renvoie 401.
 * L'application redirige alors automatiquement vers /login.
 */
export async function mockAuthNotLoggedIn(page: Page) {
	await page.route("**/api/auth/me", (route) =>
		route.fulfill({ status: 401, json: { error: "Unauthorized" } })
	);
}

// ---------------------------------------------------------------------------
// Mocks des guildes
// ---------------------------------------------------------------------------

/**
 * Simule la liste des serveurs Discord de l'utilisateur.
 * Intercepte GET /api/auth/guilds.
 */
export async function mockGuilds(page: Page, guilds: DiscordGuild[] = [MOCK_GUILD]) {
	await page.route("**/api/auth/guilds", (route) => route.fulfill({ json: guilds }));
}

/**
 * Simule l'endpoint de rafraîchissement du cache de guildes.
 * Intercepte POST /api/auth/guilds/refresh.
 */
export async function mockRefreshGuilds(page: Page) {
	await page.route("**/api/auth/guilds/refresh", (route) =>
		route.fulfill({ json: { ok: true } })
	);
}

/**
 * Simule l'URL d'invitation du bot pour un serveur donné.
 * Intercepte GET /api/guilds/:guildId/invite.
 */
export async function mockInviteUrl(page: Page, guildId: string = MOCK_GUILD_NO_BOT.id) {
	await page.route(`**/api/guilds/${guildId}/invite`, (route) =>
		route.fulfill({
			json: { url: "https://discord.com/oauth2/authorize?client_id=test&scope=bot" },
		})
	);
}

// ---------------------------------------------------------------------------
// Mocks de la configuration de guilde
// ---------------------------------------------------------------------------

/**
 * Simule la configuration d'un serveur (admin uniquement).
 * Intercepte GET /api/guilds/:guildId/config.
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
 * Simule la liste des salons du serveur (utilisée par le formulaire admin).
 * Intercepte GET /api/guilds/:guildId/channels.
 */
export async function mockGuildChannels(page: Page, guildId: string = MOCK_GUILD.id) {
	await page.route(`**/api/guilds/${guildId}/channels`, (route) =>
		route.fulfill({ json: [] })
	);
}

/**
 * Simule la liste des rôles du serveur (utilisée par le formulaire admin).
 * Intercepte GET /api/guilds/:guildId/roles.
 */
export async function mockGuildRoles(page: Page, guildId: string = MOCK_GUILD.id) {
	await page.route(`**/api/guilds/${guildId}/roles`, (route) =>
		route.fulfill({ json: [] })
	);
}

// ---------------------------------------------------------------------------
// Mocks de la configuration utilisateur
// ---------------------------------------------------------------------------

/**
 * Simule la configuration personnelle de l'utilisateur sur un serveur.
 * Intercepte GET /api/guilds/:guildId/user-config.
 *
 * @param data  - `isAdmin: true` → les onglets Admin et Template sont affichés.
 *              - `isAdmin: false` → seuls User et Characters sont affichés.
 */
export async function mockUserConfig(
	page: Page,
	guildId: string = MOCK_GUILD.id,
	data: ApiUserConfig = { isAdmin: true, userConfig: null }
) {
	await page.route(`**/api/guilds/${guildId}/user-config`, (route) =>
		route.fulfill({ json: data })
	);
}

// ---------------------------------------------------------------------------
// Mocks des personnages
// ---------------------------------------------------------------------------

/**
 * Simule la liste des personnages d'un utilisateur sur un serveur.
 * Intercepte GET /api/guilds/:guildId/characters.
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
 * Simule le nombre total de personnages enregistrés sur un serveur.
 * Intercepte GET /api/guilds/:guildId/characters/count.
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

// ---- Mock du langage, pas réellement un i18n parce que justement on test pas ça ici, juste la présence de certaines chaînes en fonction de la config de langue. ----

export const languages = {
	en: en,
	fr: fr,
} as const;
