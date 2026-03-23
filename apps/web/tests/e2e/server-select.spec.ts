/**
 * Tests de la page de sélection de serveur (/)
 *
 * Concepts Playwright utilisés ici :
 *   - `page.route()`            → intercepter des requêtes réseau (mock API)
 *   - `page.getByText()`        → sélectionner un élément par son texte
 *   - `page.getByRole()`        → sélectionner par rôle ARIA
 *   - `expect(locator).toBeVisible()` → assertion de visibilité
 *   - `page.waitForURL()`       → attendre une navigation vers une URL
 */

import { expect, type Page, test } from "@playwright/test";
import {
	languages,
	MOCK_GUILD,
	MOCK_GUILD_NO_BOT,
	mockAuthMe,
	mockCharacters,
	mockGuildChannels,
	mockGuildConfig,
	mockGuildRoles,
	mockGuilds,
	mockInviteUrl,
	mockRefreshGuilds,
	mockUserConfig,
} from "./fixtures/api-mocks";

const { fr, en } = languages;

async function conn(page: Page, NoInvit = MOCK_GUILD_NO_BOT, Invited = MOCK_GUILD) {
	await mockAuthMe(page);
	await mockGuilds(page, [NoInvit, Invited]);
	await mockInviteUrl(page, NoInvit.id); // mock de l'URL d'invitation pour le serveur avec bot
	await mockGuildConfig(page, Invited.id); // mock de la config de guilde pour que le dashboard puisse charger
	await page.goto("/");
	await page.waitForURL(/\/$/);
}

// ============================================================================
// ✅ TEST IMPLÉMENTÉ — Exemple de référence
// ============================================================================

test("Les boutons principaux sont bien affichés", async ({ page }) => {
	await conn(page);
	await test.step("le nom de l'application et le bouton Documentation sont visibles", async () => {
		await expect(page.getByRole("link", { name: /Dicelette/ })).toBeVisible();
		await expect(page.getByRole("button", { name: /Test Server/ })).toBeVisible();
		//app bar
		await expect(page.getByRole("button", { name: "Documentation" })).toBeVisible();
		await expect(page.getByRole("button", { name: fr.common.darkTheme })).toBeVisible();
		await expect(page.getByText("Test User")).toBeVisible();
		await expect(page.getByRole("heading", { name: fr.servers.title })).toBeVisible();
	});
	await test.step("La langue peut être changée", async () => {
		//combo box
		await expect(page.getByRole("combobox")).toBeVisible();
		//test du click
		const combobox = page.getByRole("combobox");
		await combobox.click();
		await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
		await page.getByRole("option", { name: "EN" }).click();
		await expect(combobox).toHaveText("EN", {
			ignoreCase: true,
			useInnerText: true,
		});
		//vérifions qu'on a bien changé de langue, on va utiliser ressource
		await expect(page.getByRole("button", { name: /Documentation/ })).toBeVisible();
		await expect(page.getByRole("button", { name: en.common.darkTheme })).toBeVisible();
		await expect(page.getByRole("heading", { name: en.servers.title })).toBeVisible();
	});
	await expect(page.getByText("Test User")).toBeVisible();
	await test.step("On passe bien en thème dark", async () => {
		const darkButton = page.getByRole("button", { name: /Dark Theme/ });
		await expect(darkButton).toBeVisible();
		await darkButton.click();
		//vérifions que le thème a bien changé, on va vérifier la présence d'un élément spécifique au thème dark
		await expect(page.getByRole("button", { name: /Light Theme/ })).toBeVisible();
	});
});

// ============================================================================
// 💬 EXERCICES — À compléter
// ============================================================================

// Exercice 1 : Un serveur sans bot affiche le bouton "Add"
//
// Indice : MOCK_GUILD_NO_BOT a botPresent = false.
//          L'application affiche une section "Add Dicelette" avec un bouton "Add".
//          Utilise mockGuilds(page, [MOCK_GUILD_NO_BOT]) pour ne retourner
//          qu'un serveur sans bot.
//
test("un serveur sans bot affiche le bouton 'Add'", async ({ page }) => {
	await mockInviteUrl(page, MOCK_GUILD_NO_BOT.id); // mock de l'URL d'invitation pour ce serveur
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD); // un seul serveur, pas de bot
	// La section "Add Dicelette" doit être visible
	await expect(page.getByRole("button", { name: fr.common.add })).toBeVisible();
	// Cliquons sur le bouton "Add" et vérifions que la requête d'invitation est bien émise
	const [response] = await Promise.all([
		page.waitForResponse((res) =>
			res.url().includes(`/api/guilds/${MOCK_GUILD_NO_BOT.id}/invite`)
		),
		page.getByRole("button", { name: fr.common.add }).click(),
	]);
	expect(response.status()).toBe(200);
});

// Exercice 2 : Cliquer sur un serveur (avec bot) navigue vers /dashboard/:guildId
//
// Indice : Les cartes de serveurs avec bot sont cliquables (CardActionArea).
//          Clique sur la carte puis vérifie l'URL avec page.waitForURL().
//          L'URL attendue est `/dashboard/${MOCK_GUILD.id}`.
//
test("cliquer sur un serveur navigue vers le dashboard", async ({ page }) => {
	await mockUserConfig(page, MOCK_GUILD.id);
	await mockGuildChannels(page, MOCK_GUILD.id);
	await mockGuildRoles(page, MOCK_GUILD.id);
	await mockCharacters(page, MOCK_GUILD.id);
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD);
	await page.getByRole("button", { name: /Test Server/ }).click();
	await page.waitForURL(`/dashboard/${MOCK_GUILD.id}`);
	await expect(page.getByRole("heading", { name: fr.dashboard.title })).toBeVisible();
});

// Exercice 3 : Le bouton "Refresh" envoie POST /api/auth/guilds/refresh
//
// Indice : Utilise `page.route()` directement dans le test pour intercepter la
//          requête POST et vérifier qu'elle est bien émise.
//          Tu peux utiliser `page.waitForRequest()` ou un compteur dans le handler.
//          N'oublie pas de mocker aussi mockRefreshGuilds pour que la requête
//          ne parte pas vers un vrai serveur.
//
test("le bouton Refresh appelle POST /api/auth/guilds/refresh", async ({ page }) => {
	await mockRefreshGuilds(page);
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD);
	await expect(page.getByRole("button", { name: fr.servers.refresh })).toBeVisible();
	//on doit utiliser mockRefreshGuilds pour que la requête ne parte pas vers un vrai serveur
	//on va utiliser page.waitForRequest pour vérifier que la requête est bien émise
	const [request] = await Promise.all([
		page.waitForResponse((req) => req.url().includes("/api/auth/guilds/refresh")),
		page.getByRole("button", { name: fr.servers.refresh }).click(),
	]);
	expect(request.status()).toBe(200);
});
