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
import { mockAuthMe, mockAuthNotLoggedIn } from "./fixtures/api-mocks";

// ============================================================================
// ✅ TEST IMPLÉMENTÉ — Exemple de référence
// ============================================================================

test("la page /login affiche le titre et le bouton de connexion Discord", async ({ page }) => {
	// On simule un utilisateur non connecté : /api/auth/me renvoie 401.
	// L'application redirige alors vers /login automatiquement.
	await mockAuthNotLoggedIn(page);

	await page.goto("/login");

	// Vérifie que le titre "Dicelette Dashboard" est affiché
	await expect(page.getByRole("heading", { name: "Dicelette Dashboard" })).toBeVisible();

	// Vérifie que le bouton de connexion Discord est présent
	await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();
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
// test("accéder à '/' sans être connecté redirige vers /login", async ({ page }) => {
//
// });

// Exercice 2 : Le sélecteur de langue EN/FR est visible sur la page de login
//
// Indice : Le sélecteur est un <select> MUI contenant les options "FR" et "EN".
//          Cherche-le avec `page.getByRole("combobox")`.
//          Vérifie ensuite qu'il est bien visible.
//
// test("le sélecteur de langue est visible sur la page de login", async ({ page }) => {
//
// });

// Exercice 3 : Un utilisateur déjà connecté qui accède à /login est redirigé vers "/"
//
// Indice : mockAuthMe simule un utilisateur connecté (GET /api/auth/me → 200).
//          L'application React redirige les utilisateurs connectés loin de /login.
//          N'oublie pas de mocker aussi /api/auth/guilds pour que "/" se charge.
//
// test("un utilisateur connecté accédant à /login est redirigé vers /", async ({ page }) => {
//
// });
