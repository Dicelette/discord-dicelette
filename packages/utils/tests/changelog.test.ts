import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getAllVersions,
	getChangelogSince,
	getOptionsVersion,
	normalizeChangelogFormat,
	splitChangelogByVersion,
} from "../src/changelog";

const mockChangelog = `# Changelog

## [2.20.0](https://example.com) (2025-11-23)

### Features

* new feature A

## [2.19.0](https://example.com) (2025-11-22)

### Features

* feature B

### Bug Fixes

* fix something

## [2.18.1](https://example.com) (2025-11-21)

### Bug Fixes

* another fix

## [2.18.0](https://example.com) (2025-11-20)

### Features

* old feature
`;

describe("changelog utilities", () => {
	beforeEach(() => {
		vi.spyOn(fs, "readFileSync").mockReturnValue(mockChangelog);
		vi.spyOn(path, "resolve").mockImplementation((...args) => args.join("/"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getAllVersions", () => {
		it("should return all versions from changelog", () => {
			const versions = getAllVersions();

			expect(versions).toHaveLength(4);
			expect(versions).toContain("2.20.0");
			expect(versions).toContain("2.19.0");
			expect(versions).toContain("2.18.1");
			expect(versions).toContain("2.18.0");
		});

		it("should return versions in descending order", () => {
			const versions = getAllVersions();

			expect(versions[0]).toBe("2.20.0");
			expect(versions[1]).toBe("2.19.0");
			expect(versions[2]).toBe("2.18.1");
			expect(versions[3]).toBe("2.18.0");
		});

		it("should handle changelog without versions", () => {
			vi.spyOn(fs, "readFileSync").mockReturnValue("# Changelog\n\nNo versions here");

			const versions = getAllVersions();

			expect(versions).toEqual([]);
		});
	});

	describe("getChangelogSince", () => {
		it("should return entries more recent than specified version (exclusive)", () => {
			const result = getChangelogSince("2.18.1", false);

			expect(result).toContain("2.20.0");
			expect(result).toContain("2.19.0");
			expect(result).not.toContain("2.18.1");
			expect(result).not.toContain("2.18.0");
		});

		it("should return entries including specified version (inclusive)", () => {
			const result = getChangelogSince("2.18.1", true);

			expect(result).toContain("2.20.0");
			expect(result).toContain("2.19.0");
			expect(result).toContain("2.18.1");
			expect(result).not.toContain("2.18.0");
		});

		it("should return empty string if no newer versions", () => {
			const result = getChangelogSince("2.20.0", false);

			expect(result).toBe("");
		});

		it("should return all versions if base version is oldest", () => {
			const result = getChangelogSince("2.18.0", false);

			expect(result).toContain("2.20.0");
			expect(result).toContain("2.19.0");
			expect(result).toContain("2.18.1");
			expect(result).not.toContain("2.18.0");
		});

		it("should include the latest version when inclusive", () => {
			const result = getChangelogSince("2.20.0", true);

			expect(result).toContain("2.20.0");
		});
	});

	describe("getOptionsVersion", () => {
		it("should return versions as name-value pairs", () => {
			const options = getOptionsVersion();

			expect(options).toHaveLength(4);
			expect(options[0]).toEqual({ name: "2.20.0", value: "2.20.0" });
			expect(options[1]).toEqual({ name: "2.19.0", value: "2.19.0" });
		});

		it("should return all versions in descending order", () => {
			const options = getOptionsVersion();

			expect(options.map((o) => o.name)).toEqual([
				"2.20.0",
				"2.19.0",
				"2.18.1",
				"2.18.0",
			]);
		});
	});

	describe("splitChangelogByVersion", () => {
		it("should split changelog into chunks within limit", () => {
			const chunks = splitChangelogByVersion(mockChangelog, 300);

			expect(chunks.length).toBeGreaterThan(0);
			for (const chunk of chunks) {
				expect(chunk.length).toBeLessThanOrEqual(300);
			}
		});

		it("should keep version sections together when possible", () => {
			const chunks = splitChangelogByVersion(mockChangelog, 1000);

			for (const chunk of chunks) {
				const versionMatches = [...chunk.matchAll(/## \[(\d+\.\d+\.\d+)]/g)];
				expect(versionMatches.length).toBeGreaterThan(0);
			}
		});

		it("should return single chunk if content fits in limit", () => {
			const chunks = splitChangelogByVersion(mockChangelog, 10000);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(mockChangelog.trim());
		});

		it("should handle changelog without version headers", () => {
			const simpleLog = "Some simple changelog content";
			const chunks = splitChangelogByVersion(simpleLog, 100);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(simpleLog);
		});

		it("should use default limit of 4000 when not specified", () => {
			const longChangelog = "## [1.0.0]\n" + "x".repeat(5000);
			vi.spyOn(fs, "readFileSync").mockReturnValue(longChangelog);

			const chunks = splitChangelogByVersion(longChangelog);

			expect(chunks.length).toBeGreaterThan(1);
		});
	});

	describe("normalizeChangelogFormat", () => {
		it("should add emojis to Features sections", () => {
			const input = "### Features\n\n* some feature";
			const result = normalizeChangelogFormat(input);

			expect(result).toContain("### ✨ Features");
		});

		it("should add emojis to Bug Fixes sections", () => {
			const input = "### Bug Fixes\n\n* some fix";
			const result = normalizeChangelogFormat(input);

			expect(result).toContain("### 🐛 Bug Fixes");
		});

		it("should handle version headers", () => {
			const input = "## [1.0.0](https://example.com)";
			const result = normalizeChangelogFormat(input);

			expect(result).toContain("__[1.0.0](https://example.com)__");
		});

		it("should remove consecutive empty lines", () => {
			const input = "Line 1\n\n\n\nLine 2";
			const result = normalizeChangelogFormat(input);

			const emptyLineCount = (result.match(/\n\n/g) || []).length;
			expect(emptyLineCount).toBeLessThan(3);
		});

		it("should preserve single empty lines", () => {
			const input = "Line 1\n\nLine 2";
			const result = normalizeChangelogFormat(input);

			expect(result).toContain("Line 1\n\nLine 2");
		});

		it("should handle complete changelog section", () => {
			const input = `## [1.0.0](https://example.com)

### Features

* new feature

### Bug Fixes

* bug fix`;

			const result = normalizeChangelogFormat(input);

			expect(result).toContain("### ✨ Features");
			expect(result).toContain("### 🐛 Bug Fixes");
			expect(result).toContain("__[1.0.0](https://example.com)__");
		});

		it("should trim trailing whitespace from lines", () => {
			const input = "Line with trailing spaces   \n";
			const result = normalizeChangelogFormat(input);

			expect(result).not.toMatch(/\s+\n/);
		});
	});

	describe("integration scenarios", () => {
		it("should get versions, filter since version, and normalize", () => {
			const versions = getAllVersions();
			expect(versions[0]).toBe("2.20.0");

			const recent = getChangelogSince("2.18.1", false);
			expect(recent).toContain("2.20.0");

			const normalized = normalizeChangelogFormat(recent);
			expect(normalized).toContain("✨ Features");
		});

		it("should split and maintain version integrity", () => {
			const chunks = splitChangelogByVersion(mockChangelog, 500);

			let totalVersions = 0;
			for (const chunk of chunks) {
				const versions = [...chunk.matchAll(/## \[(\d+\.\d+\.\d+)]/g)];
				totalVersions += versions.length;
			}

			const originalVersions = getAllVersions();
			expect(totalVersions).toBe(originalVersions.length);
		});
	});
});
