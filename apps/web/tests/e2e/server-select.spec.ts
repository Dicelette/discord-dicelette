/**
 * Tests for the server selection page (/)
 *
 * Playwright concepts used here:
 *   - `page.route()`            → intercept network requests (mock API)
 *   - `page.getByText()`        → select element by text
 *   - `page.getByRole()`        → select by ARIA role
 *   - `expect(locator).toBeVisible()` → visibility assertion
 *   - `page.waitForURL()`       → wait for navigation to URL
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
	await mockInviteUrl(page, NoInvit.id); // Mock invitation URL for server with bot
	await mockGuildConfig(page, Invited.id); // Mock guild config so dashboard can load
	await page.goto("/");
	await page.waitForURL(/\/$/);
}

// ============================================================================
// ✅ TEST IMPLEMENTED — Reference example
// ============================================================================

test("Main buttons are displayed correctly", async ({ page }) => {
	await conn(page);
	await test.step("application name and Documentation button are visible", async () => {
		await expect(page.getByRole("link", { name: /Dicelette/ })).toBeVisible();
		await expect(page.getByRole("button", { name: /Test Server/ })).toBeVisible();
		//app bar
		await expect(page.getByRole("button", { name: "Documentation" })).toBeVisible();
		await expect(page.getByRole("button", { name: fr.common.darkTheme })).toBeVisible();
		await expect(page.getByText("Test User")).toBeVisible();
		await expect(page.getByRole("heading", { name: fr.servers.title })).toBeVisible();
	});
	await test.step("Language can be changed", async () => {
		// combo box
		await expect(page.getByRole("combobox")).toBeVisible();
		// test click
		const combobox = page.getByRole("combobox");
		await combobox.click();
		await expect(page.getByRole("option", { name: "EN" })).toBeVisible();
		await page.getByRole("option", { name: "EN" }).click();
		await expect(combobox).toHaveText("EN", {
			ignoreCase: true,
			useInnerText: true,
		});
		// verify that we changed language correctly, we will use resources
		await expect(page.getByRole("button", { name: /Documentation/ })).toBeVisible();
		await expect(page.getByRole("button", { name: en.common.darkTheme })).toBeVisible();
		await expect(page.getByRole("heading", { name: en.servers.title })).toBeVisible();
	});
	await expect(page.getByText("Test User")).toBeVisible();
	await test.step("Dark theme is switched correctly", async () => {
		const darkButton = page.getByRole("button", { name: /Dark Theme/ });
		await expect(darkButton).toBeVisible();
		await darkButton.click();
		// verify that theme changed correctly, we will check for a dark-theme-specific element
		await expect(page.getByRole("button", { name: /Light Theme/ })).toBeVisible();
	});
});

// ============================================================================
// 💬 EXERCISES — To complete
// ============================================================================

// Exercise 1 : A server without bot displays the "Add" button
//
// Hint : MOCK_GUILD_NO_BOT has botPresent = false.
//        The application displays an "Add Dicelette" section with an "Add" button.
//        Use mockGuilds(page, [MOCK_GUILD_NO_BOT]) to return
//        only a server without bot.
//
test("a server without bot displays the 'Add' button", async ({ page }) => {
	await mockInviteUrl(page, MOCK_GUILD_NO_BOT.id); // Mock invitation URL for this server
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD); // only one server, no bot
	// The "Add Dicelette" section must be visible
	await expect(page.getByRole("button", { name: fr.common.add })).toBeVisible();
	// Click the "Add" button and verify the invite request is sent
	const [response] = await Promise.all([
		page.waitForResponse((res) =>
			res.url().includes(`/api/guilds/${MOCK_GUILD_NO_BOT.id}/invite`)
		),
		page.getByRole("button", { name: fr.common.add }).click(),
	]);
	expect(response.status()).toBe(200);
});

// Exercise 2 : Click on a server (with bot) navigates to /dashboard/:guildId
//
// Hint : Server cards with bot are clickable (CardActionArea).
//        Click on the card then verify the URL with page.waitForURL().
//        Expected URL is `/dashboard/${MOCK_GUILD.id}`.
//
test("clicking on a server navigates to dashboard", async ({ page }) => {
	await mockUserConfig(page, MOCK_GUILD.id);
	await mockGuildChannels(page, MOCK_GUILD.id);
	await mockGuildRoles(page, MOCK_GUILD.id);
	await mockCharacters(page, MOCK_GUILD.id);
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD);
	await page.getByRole("button", { name: /Test Server/ }).click();
	await page.waitForURL(`/dashboard/${MOCK_GUILD.id}`);
	await expect(page.getByRole("heading", { name: fr.dashboard.title })).toBeVisible();
});

// Exercise 3 : The "Refresh" button sends POST /api/auth/guilds/refresh
//
// Hint : Use `page.route()` directly in the test to intercept the
//        POST request and verify it is sent.
//        You can use `page.waitForRequest()` or a counter in the handler.
//        Don't forget to also mock mockRefreshGuilds so the request
//        doesn't go to a real server.
//
test("Refresh button calls POST /api/auth/guilds/refresh", async ({ page }) => {
	await mockRefreshGuilds(page);
	await conn(page, MOCK_GUILD_NO_BOT, MOCK_GUILD);
	await expect(page.getByRole("button", { name: fr.servers.refresh })).toBeVisible();
	// we must use mockRefreshGuilds so the request doesn't go to a real server
	// we will use page.waitForRequest to verify the request is sent
	const [request] = await Promise.all([
		page.waitForResponse((req) => req.url().includes("/api/auth/guilds/refresh")),
		page.getByRole("button", { name: fr.servers.refresh }).click(),
	]);
	expect(request.status()).toBe(200);
});
