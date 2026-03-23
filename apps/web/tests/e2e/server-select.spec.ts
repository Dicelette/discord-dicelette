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

import { expect, test } from "@playwright/test";
import {
	MOCK_GUILD,
	MOCK_GUILD_NO_BOT,
	mockAuthMe,
	mockGuilds,
	mockRefreshGuilds,
} from "./fixtures/api-mocks";

// ============================================================================
// ✅ TEST IMPLÉMENTÉ — Exemple de référence
// ============================================================================

test("la liste des serveurs affiche le serveur mocké avec le bot", async ({ page }) => {
	// 1. Mocker l'auth et la liste de serveurs AVANT la navigation
	await mockAuthMe(page);
	await mockGuilds(page, [MOCK_GUILD]); // un seul serveur, bot présent

	await page.goto("/");

	// 2. La section "Dicelette is present" doit être visible
	await expect(page.getByText("Dicelette is present")).toBeVisible();

	// 3. Le nom du serveur mocké doit apparaître dans la liste
	await expect(page.getByText(MOCK_GUILD.name)).toBeVisible();
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
// test("un serveur sans bot affiche le bouton 'Add'", async ({ page }) => {
//
// });

// Exercice 2 : Cliquer sur un serveur (avec bot) navigue vers /dashboard/:guildId
//
// Indice : Les cartes de serveurs avec bot sont cliquables (CardActionArea).
//          Clique sur la carte puis vérifie l'URL avec page.waitForURL().
//          L'URL attendue est `/dashboard/${MOCK_GUILD.id}`.
//
// test("cliquer sur un serveur navigue vers le dashboard", async ({ page }) => {
//
// });

// Exercice 3 : Le bouton "Refresh" envoie POST /api/auth/guilds/refresh
//
// Indice : Utilise `page.route()` directement dans le test pour intercepter la
//          requête POST et vérifier qu'elle est bien émise.
//          Tu peux utiliser `page.waitForRequest()` ou un compteur dans le handler.
//          N'oublie pas de mocker aussi mockRefreshGuilds pour que la requête
//          ne parte pas vers un vrai serveur.
//
// test("le bouton Refresh appelle POST /api/auth/guilds/refresh", async ({ page }) => {
//
// });
