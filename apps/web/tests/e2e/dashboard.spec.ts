/**
 * Tests du tableau de bord (/dashboard/:guildId)
 *
 * Concepts Playwright utilisés ici :
 *   - `page.getByRole("tab")`   → sélectionner un onglet MUI par son rôle ARIA
 *   - `locator.click()`         → simuler un clic
 *   - `locator.fill()`          → remplir un champ de formulaire
 *   - `expect(locator).toHaveCount()` → vérifier le nombre d'éléments
 *   - `expect(locator).not.toBeVisible()` → vérifier l'absence d'un élément
 */

import { expect, test } from "@playwright/test";
import {
	languages,
	MOCK_GUILD,
	mockAuthMe,
	mockCharactersCount,
	mockGuildChannels,
	mockGuildConfig,
	mockGuildRoles,
	mockGuilds,
	mockUserConfig,
} from "./fixtures/api-mocks";

// URL du dashboard pour le serveur mocké
const DASHBOARD_URL = `/dashboard/${MOCK_GUILD.id}`;

// ============================================================================
// ✅ TEST IMPLÉMENTÉ — Exemple de référence
// ============================================================================

const { fr, en } = languages;

test("un admin voit les 4 onglets : Admin, Template, User, Characters", async ({
	page,
}) => {
	// 1. Mocker tous les endpoints nécessaires au chargement du dashboard admin
	await mockAuthMe(page);
	await mockGuilds(page);
	await mockUserConfig(page, MOCK_GUILD.id, {
		isAdmin: true,
		userConfig: null,
		isStrictAdmin: false,
	});
	await mockGuildConfig(page);
	await mockGuildChannels(page);
	await mockGuildRoles(page);
	await mockCharactersCount(page, MOCK_GUILD.id, 1);

	await page.goto(DASHBOARD_URL);

	// 2. Vérifier la présence des 4 onglets (MUI Tab → role="tab")
	await expect(page.getByRole("tab", { name: fr.dashboard.tabs.admin })).toBeVisible();
	await expect(page.getByRole("tab", { name: fr.dashboard.tabs.template })).toBeVisible();
	await expect(page.getByRole("tab", { name: fr.dashboard.tabs.user })).toBeVisible();
	await expect(
		page.getByRole("tab", { name: fr.dashboard.tabs.characters })
	).toBeVisible();
});

test("l'onglet Mes personnages est masqué quand le serveur n'a aucun personnage", async ({
	page,
}) => {
	await mockAuthMe(page);
	await mockGuilds(page);
	await mockUserConfig(page, MOCK_GUILD.id, {
		isAdmin: false,
		userConfig: null,
		isStrictAdmin: false,
	});
	await mockCharactersCount(page, MOCK_GUILD.id, 0);

	await page.goto(DASHBOARD_URL);

	await expect(page.getByRole("tab", { name: fr.dashboard.tabs.user })).toBeVisible();
	await expect(page.getByRole("tab", { name: fr.dashboard.tabs.characters })).toHaveCount(
		0
	);
	await expect(page.getByText(/snippets/i)).toBeVisible();
});

// ============================================================================
// 💬 EXERCICES — À compléter
// ============================================================================

// Exercice 1 : Cliquer sur l'onglet "Characters" affiche le personnage mocké
//
// Indice : Après avoir chargé le dashboard admin, clique sur l'onglet "Characters".
//          mockCharacters() injecte MOCK_CHARACTER dont le charName est "Aragorn".
//          Vérifie ensuite que le texte "Aragorn" est visible dans la page.
//          N'oublie pas de mocker mockCharacters avant la navigation.
//
// test("l'onglet Characters affiche le personnage mocké", async ({ page }) => {
//
// });

// Exercice 2 : Cliquer sur l'onglet "Personal configuration" affiche le formulaire snippets
//
// Indice : L'onglet "Personal configuration" (valeur "user") contient le composant
//          UserConfigForm avec une section "Snippets".
//          Après le clic, cherche le texte "Snippets" ou "snippets" dans la page.
//          Utilise mockUserConfig avec isAdmin: true pour avoir les 4 onglets.
//
// test("l'onglet Personal configuration affiche la section snippets", async ({ page }) => {
//
// });

// Exercice 3 : Un utilisateur non-admin voit seulement 2 onglets (User + Characters)
//
// Indice : mockUserConfig avec `isAdmin: false` fait que l'application n'affiche
//          que les onglets "Personal configuration" et "Characters".
//          Utilise `not.toBeVisible()` pour vérifier l'absence des onglets admin.
//          Attention : si isAdmin est false, il ne faut PAS mocker getConfig,
//          channels et roles (ces endpoints ne seront pas appelés).
//
// test("un non-admin voit uniquement les onglets User et Characters", async ({ page }) => {
//
// });

// Exercice 4 : Le bouton "Back to servers" ramène à la page "/"
//
// Indice : Le dashboard contient un bouton avec le texte "Back to servers".
//          Clique dessus et vérifie que l'URL revient sur "/".
//          Utilise page.waitForURL("/") pour attendre la navigation.
//
// test("le bouton 'Back to servers' ramène à la liste des serveurs", async ({ page }) => {
//
// });
