import { defineConfig, devices } from "@playwright/test";

// Points to the Chromium binary already cached on the machine.
// Run `npx playwright install chromium` if you want Playwright to manage its own copy.

export default defineConfig({
	testDir: "./tests/e2e",

	// Maximum time a single test can run
	timeout: 15_000,

	// Maximum time an assertion like `expect(locator).toBeVisible()` can wait
	expect: { timeout: 5_000 },

	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,

	reporter: [["html", { open: "never" }], ["line"]],

	use: {
		baseURL: "http://localhost:5173",
		// Capture screenshot and video on failure to help debug
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		// Traces are useful for step-by-step debugging: npx playwright show-trace
		trace: "on-first-retry",
	},

	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],

	// Automatically starts the Vite dev server before running tests.
	// If the server is already running (e.g. during local development), it is reused.
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
});
