/**
 * Tests for the dashboard (/dashboard/:guildId)
 *
 * Playwright concepts used here:
 *   - `page.getByRole("tab")`   → select MUI tab by ARIA role
 *   - `locator.click()`         → simulate a click
 *   - `locator.fill()`          → fill form field
 *   - `expect(locator).toHaveCount()` → verify number of elements
 *   - `expect(locator).not.toBeVisible()` → verify element is not visible
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

// Dashboard URL for mocked server
const DASHBOARD_URL = `/dashboard/${MOCK_GUILD.id}`;

// ============================================================================
// ✅ TEST IMPLEMENTED — Reference example
// ============================================================================

const { fr, en } = languages;

test("un admin voit les 4 onglets : Admin, Template, User, Characters", async ({
	page,
}) => {
	// 1. Mock all endpoints needed for dashboard admin loading
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

	// 2. Verify the presence of 4 tabs (MUI Tab → role="tab")
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
// 💬 EXERCISES — To complete
// ============================================================================

// Exercise 1 : Clicking "Characters" tab displays mocked character
//
// Hint : After loading dashboard admin, click "Characters" tab.
//        mockCharacters() injects MOCK_CHARACTER with charName "Aragorn".
//        Then verify "Aragorn" text is visible in the page.
//        Don't forget to mock mockCharacters before navigation.
//
// test("Characters tab displays mocked character", async ({ page }) => {
//
// });

// Exercise 2 : Clicking "Personal configuration" tab displays snippets form
//
// Hint : "Personal configuration" tab (value "user") contains
//        UserConfigForm with a "Snippets" section.
//        After clicking, search for "Snippets" or "snippets" text in page.
//        Use mockUserConfig with isAdmin: true to get 4 tabs.
//
// test("Personal configuration tab displays snippets section", async ({ page }) => {
//
// });

// Exercise 3 : Non-admin user sees only 2 tabs (User + Characters)
//
// Hint : mockUserConfig with `isAdmin: false` makes the app display
//        only "Personal configuration" and "Characters" tabs.
//        Use `not.toBeVisible()` to verify absence of admin tabs.
//        Caution: if isAdmin is false, do NOT mock getConfig,
//        channels and roles (these endpoints won't be called).
//
// test("non-admin user sees only User and Characters tabs", async ({ page }) => {
//
// });

// Exercise 4 : "Back to servers" button returns to "/" page
//
// Hint : Dashboard contains a button with "Back to servers" text.
//        Click it and verify URL returns to "/".
//        Use page.waitForURL("/") to wait for navigation.
//
// test("Back to servers button returns to server list", async ({ page }) => {
//
// });
