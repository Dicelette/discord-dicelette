import { describe, expect, it } from "vitest";
import {
	COMPILED_PATTERNS,
	cleanAvatarUrl,
	DICE_PATTERNS,
	getCachedRegex,
	verifyAvatarUrl,
} from "../src/regex";

describe("verifyAvatarUrl", () => {
	it("should return the URL for valid HTTPS avatar URLs", () => {
		const validUrls = [
			"https://cdn.discordapp.com/avatars/123/abc.png",
			"https://example.com/avatar/user.jpg",
			"https://cdn.example.com/path/to/image.jpeg",
			"https://site.com/avatar.gif",
			"https://example.com/image.webp",
		];

		for (const url of validUrls) {
			expect(verifyAvatarUrl(url)).toBe(url);
		}
	});

	it("should return false for empty strings", () => {
		expect(verifyAvatarUrl("")).toBe(false);
	});

	it("should return false for invalid URLs", () => {
		const invalidUrls = [
			"http://example.com/avatar.png", // HTTP not HTTPS
			"https://example.com/avatar.txt", // Invalid extension
			"not-a-url",
			"https://example.com/noextension",
		];

		for (const url of invalidUrls) {
			expect(verifyAvatarUrl(url)).toBe(false);
		}
	});

	it("should accept attachment:// URLs with valid extensions", () => {
		const attachmentUrls = [
			"attachment://image.png",
			"attachment://avatar.jpg",
			"attachment://photo.jpeg",
			"attachment://animated.gif",
			"attachment://picture.webp",
		];

		for (const url of attachmentUrls) {
			expect(verifyAvatarUrl(url)).toBe(url);
		}
	});

	it("should reject attachment:// URLs with invalid extensions", () => {
		expect(verifyAvatarUrl("attachment://file.txt")).toBe(false);
		expect(verifyAvatarUrl("attachment://document.pdf")).toBe(false);
	});

	it("should handle URLs with query parameters", () => {
		const url = "https://cdn.discordapp.com/avatars/123/abc.png?size=256";
		expect(verifyAvatarUrl(url)).toBe(url);
	});
});

describe("cleanAvatarUrl", () => {
	it("should remove query parameters from Discord CDN URLs", () => {
		const urls = [
			{
				input: "https://cdn.discordapp.com/avatars/123/abc.png?size=256",
				expected: "https://cdn.discordapp.com/avatars/123/abc.png",
			},
			{
				input: "https://media.discordapp.net/attachments/123/456/image.jpg?width=400",
				expected: "https://media.discordapp.net/attachments/123/456/image.jpg",
			},
			{
				input: "https://cdn.discordapp.com/icons/guild/icon.webp?v=1",
				expected: "https://cdn.discordapp.com/icons/guild/icon.webp",
			},
		];

		for (const { input, expected } of urls) {
			expect(cleanAvatarUrl(input)).toBe(expected);
		}
	});

	it("should return non-Discord URLs unchanged", () => {
		const urls = [
			"https://example.com/avatar.png?size=256",
			"https://other-cdn.com/image.jpg?v=1",
			"attachment://photo.png",
		];

		for (const url of urls) {
			expect(cleanAvatarUrl(url)).toBe(url);
		}
	});

	it("should handle URLs without query parameters", () => {
		const url = "https://cdn.discordapp.com/avatars/123/abc.png";
		expect(cleanAvatarUrl(url)).toBe(url);
	});
});

describe("getCachedRegex", () => {
	it("should create and cache a regex pattern", () => {
		const pattern = "test\\d+";
		const flags = "gi";

		const regex1 = getCachedRegex(pattern, flags);
		const regex2 = getCachedRegex(pattern, flags);

		expect(regex1).toBe(regex2); // Same instance from cache
		expect(regex1).toBeInstanceOf(RegExp);
		expect(regex1.source).toBe(pattern);
		expect(regex1.flags).toBe(flags);
	});

	it("should create different regex for different patterns", () => {
		const regex1 = getCachedRegex("pattern1", "i");
		const regex2 = getCachedRegex("pattern2", "i");

		expect(regex1).not.toBe(regex2);
		expect(regex1.source).toBe("pattern1");
		expect(regex2.source).toBe("pattern2");
	});

	it("should create different regex for different flags", () => {
		const pattern = "test";
		const regex1 = getCachedRegex(pattern, "i");
		const regex2 = getCachedRegex(pattern, "g");

		expect(regex1).not.toBe(regex2);
		expect(regex1.flags).toBe("i");
		expect(regex2.flags).toBe("g");
	});

	it("should handle patterns without flags", () => {
		const pattern = "simple";
		const regex = getCachedRegex(pattern);

		expect(regex).toBeInstanceOf(RegExp);
		expect(regex.source).toBe(pattern);
		expect(regex.flags).toBe("");
	});

	it("should work correctly with cached regex", () => {
		const pattern = "\\d+";
		const regex = getCachedRegex(pattern, "g");

		const text = "abc123def456";
		const matches = text.match(regex);

		expect(matches).toEqual(["123", "456"]);
	});
});

describe("COMPILED_PATTERNS", () => {
	it("should have COMPARATOR pattern that matches comparison signs", () => {
		const tests = [
			{ input: ">10", sign: ">", comparator: "10" },
			{ input: ">=5", sign: ">=", comparator: "5" },
			{ input: "<20", sign: "<", comparator: "20" },
			{ input: "<=15", sign: "<=", comparator: "15" },
			{ input: "==8", sign: "==", comparator: "8" },
			{ input: "!=7", sign: "!=", comparator: "7" },
		];

		for (const { input, sign, comparator } of tests) {
			const match = COMPILED_PATTERNS.COMPARATOR.exec(input);
			expect(match?.groups?.sign).toBe(sign);
			expect(match?.groups?.comparator).toBe(comparator);
		}
	});

	it("should have PUNCTUATION_ENCLOSED pattern that matches content between punctuation", () => {
		const text = "(hello) [world] {test}";
		const matches = [...text.matchAll(COMPILED_PATTERNS.PUNCTUATION_ENCLOSED)];

		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0].groups?.open).toBe("(");
		expect(matches[0].groups?.enclosed).toBe("hello");
		expect(matches[0].groups?.close).toBe(")");
	});

	it("should have QUERY_PARAMS pattern that matches query strings", () => {
		const url = "https://example.com/path?key=value&other=test";
		const cleaned = url.replace(COMPILED_PATTERNS.QUERY_PARAMS, "");

		expect(cleaned).toBe("https://example.com/path");
	});
});

describe("DICE_PATTERNS", () => {
	it("should match bracketed content with BRACKET_ROLL", () => {
		const tests = [
			{ input: "[2d6+3]", expected: "2d6+3" },
			{ input: "[1d20]", expected: "1d20" },
			{ input: "test [3d8] more", expected: "3d8" },
		];

		for (const { input, expected } of tests) {
			const match = DICE_PATTERNS.BRACKET_ROLL.exec(input);
			expect(match?.[1]).toBe(expected);
		}
	});

	it("should match dice values with DICE_VALUE", () => {
		const validDice = ["1d20", "2d6", "d10", "#d8", "{exp}", "stat.value"];

		for (const dice of validDice) {
			expect(DICE_PATTERNS.DICE_VALUE.test(dice)).toBe(true);
		}
	});

	it("should extract comments with GLOBAL_COMMENTS", () => {
		const tests = [
			{ input: "# attack roll", expected: "attack roll" },
			{ input: "#damage", expected: "damage" },
			{ input: "1d20 # saving throw", expected: "saving throw" },
		];

		for (const { input, expected } of tests) {
			const match = DICE_PATTERNS.GLOBAL_COMMENTS.exec(input);
			expect(match?.[1]).toBe(expected);
		}
	});

	it("should match message format with DETECT_DICE_MESSAGE", () => {
		const tests = ["strength 1d20+5", "attack {exp} with modifier", "skill.name 2d6"];

		for (const test of tests) {
			expect(DICE_PATTERNS.DETECT_DICE_MESSAGE.test(test)).toBe(true);
		}
	});
});
