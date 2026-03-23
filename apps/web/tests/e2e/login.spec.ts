/**
 * Tests de la page de connexion (/login)
 *
 * Concepts Playwright utilisés ici :
 *   - `page.goto(url)`          → naviguer vers une URL
 *   - `page.getByRole()`        → sélectionner un élément par rôle ARIA
 *   - `page.getByText()`        → sélectionner un élément par son texte
 *   - `expect(locator).toBeVisible()` → assertion de visibilité
 */

import { expect, test } from "@playwright/test";
import {
	languages,
	mockAuthMe,
	mockAuthNotLoggedIn,
	mockGuilds,
} from "./fixtures/api-mocks";

// ============================================================================
// ✅ TEST IMPLÉMENTÉ — Exemple de référence
// ============================================================================

test("la page /login affiche le titre et le bouton de connexion Discord", async ({
	page,
}) => {
	// On simule un utilisateur non connecté : /api/auth/me renvoie 401.
	// L'application redirige alors vers /login automatiquement.
	await mockAuthNotLoggedIn(page);

	await page.goto("/login");

	// Vérifie que le titre "Dicelette Dashboard" est affiché
	await expect(page.getByRole("heading", { name: /Dicelette/ })).toBeVisible();

	// Vérifie que le bouton de connexion Discord est présent
	await expect(page.getByRole("button", { name: /Discord/ })).toBeVisible();
});

// ============================================================================
// 💬 EXERCICES — À compléter
// ============================================================================

// Exercice 1 : Accès à "/" sans authentification → redirection vers /login
//
// Indice : mockAuthNotLoggedIn fait échouer /api/auth/me avec un 401.
//          L'application doit alors rediriger vers /login.
//          Utilise `page.waitForURL()` pour vérifier l'URL finale.
//
test("accéder à '/' sans être connecté redirige vers /login", async ({ page }) => {
	await mockAuthNotLoggedIn(page);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /Dicelette/ })).toBeVisible();
	//expect to have been redirected to /login
	await expect(page).toHaveURL(/\/login$/);
});

// Exercice 2 : Le sélecteur de langue EN/FR est visible sur la page de login
//
// Indice : Le sélecteur est un <select> MUI contenant les options "FR" et "EN".
//          Cherche-le avec `page.getByRole("combobox")`.
//          Vérifie ensuite qu'il est bien visible
await test("le sélecteur de langue est visible sur la page de login", async ({
	page,
}) => {
	await mockAuthNotLoggedIn(page);
	await page.goto("/login");

	await expect(page.getByRole("combobox")).toBeVisible();
	//test du click
	await page.getByRole("combobox").click();
	//test de la présence des options
	await expect(page.getByRole("option", { name: "FR" })).toBeVisible();
	await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
	//test de la sélection d'une option
	await page.getByRole("option", { name: "EN" }).click();
	await expect(page.getByRole("combobox")).toHaveText("EN", {
		ignoreCase: true,
		useInnerText: true,
	});
	//vérifions qu'on a bien changé de langue, on va utiliser ressource
	const en = languages.en;
	await expect(page.getByRole("heading", { name: en.login.title })).toBeVisible();
});

// Exercice 3 : Un utilisateur déjà connecté qui accède à /login est redirigé vers "/"
//
// Indice : mockAuthMe simule un utilisateur connecté (GET /api/auth/me → 200).
//          L'application React redirige les utilisateurs connectés loin de /login.
//          N'oublie pas de mocker aussi /api/auth/guilds pour que "/" se charge.
//
test("un utilisateur connecté accédant à /login est redirigé vers /", async ({
	page,
}) => {
	// Simule un utilisateur connecté
	await mockAuthMe(page);
	await mockGuilds(page); // Mock des guildes pour que la page d'accueil puisse se charger correctement
	await page.goto("/login");
	await page.waitForURL(/\/$/);
	await expect(page).toHaveURL(/\/$/);
});
