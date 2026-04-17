/**
 * Tests for the login page (/login)
 *
 * Playwright concepts used here:
 *   - `page.goto(url)`          → navigate to a URL
 *   - `page.getByRole()`        → select an element by ARIA role
 *   - `page.getByText()`        → select an element by its text
 *   - `expect(locator).toBeVisible()` → visibility assertion
 */

import { expect, test } from "@playwright/test";
import {
	languages,
	mockAuthMe,
	mockAuthNotLoggedIn,
	mockGuilds,
} from "./fixtures/api-mocks";

// ============================================================================
// ✅ TEST IMPLEMENTED — Reference example
// ============================================================================

test("the /login page displays the title and Discord login button", async ({ page }) => {
	// We simulate a non-logged-in user: /api/auth/me returns 401.
	// The application then automatically redirects to /login.
	await mockAuthNotLoggedIn(page);

	await page.goto("/login");

	// Verify that "Dicelette Dashboard" title is displayed
	await expect(page.getByRole("heading", { name: /Dicelette/ })).toBeVisible();

	// Verify that Discord login button is present
	await expect(page.getByRole("button", { name: /Discord/ })).toBeVisible();
});

// ============================================================================
// 💬 EXERCISES — To complete
// ============================================================================

// Exercise 1 : Access to "/" without authentication → redirect to /login
//
// Hint : mockAuthNotLoggedIn fails /api/auth/me with a 401.
//        The application must then redirect to /login.
//        Use `page.waitForURL()` to verify the final URL.
//
test("accessing '/' without being logged in redirects to /login", async ({ page }) => {
	await mockAuthNotLoggedIn(page);
	await page.goto("/");
	await expect(page.getByRole("heading", { name: /Dicelette/ })).toBeVisible();
	//expect to have been redirected to /login
	await expect(page).toHaveURL(/\/login$/);
});

// Exercise 2 : The EN/FR language selector is visible on the login page
//
// Hint : The selector is a MUI <select> containing "FR" and "EN" options.
//        Find it with `page.getByRole("combobox")`.
//        Then verify it is visible
test("the language selector is visible on the login page", async ({ page }) => {
	await mockAuthNotLoggedIn(page);
	await page.goto("/login");

	await expect(page.getByRole("combobox")).toBeVisible();
	// test click
	await page.getByRole("combobox").click();
	// test presence of options
	await expect(page.getByRole("option", { name: "FR" })).toBeVisible();
	await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
	// test selection of an option
	await page.getByRole("option", { name: "EN" }).click();
	await expect(page.getByRole("combobox")).toHaveText("EN", {
		ignoreCase: true,
		useInnerText: true,
	});
	// verify we changed language correctly, we will use resources
	const en = languages.en;
	await expect(page.getByRole("heading", { name: en.login.title })).toBeVisible();
});

test("sur mobile, les actions d'entête restent visibles au-dessus de la carte de login", async ({
	page,
}) => {
	await mockAuthNotLoggedIn(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/login");

	await expect(page.getByRole("button", { name: /Documentation/i })).toBeVisible();
	await expect(page.getByRole("combobox")).toBeVisible();
	await expect(page.getByRole("button", { name: /thème|theme/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /Discord/ })).toBeVisible();
	await expect(page.getByRole("heading", { name: /Dicelette/ })).toBeVisible();
});

// Exercise 3 : A logged-in user accessing /login is redirected to "/"
//
// Hint : mockAuthMe simulates a logged-in user (GET /api/auth/me → 200).
//        The React application redirects logged-in users away from /login.
//        Don't forget to also mock /api/auth/guilds so that "/" loads.
//
test("a logged-in user accessing /login is redirected to /", async ({ page }) => {
	// Simulate a logged-in user
	await mockAuthMe(page);
	await mockGuilds(page); // Mock guilds so the home page loads correctly
	await page.goto("/login");
	await page.waitForURL(/\/$/);
	await expect(page).toHaveURL(/\/$/);
});
