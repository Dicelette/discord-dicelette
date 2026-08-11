import type { Resultat } from "@dicelette/core";
import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import { replaceRollComment } from "../src/edit_comment";
import type { Server } from "../src/interfaces";
import { ResultAsText } from "../src/result_as_text";

const DATA: Server = {
	lang: Djs.Locale.EnglishUS,
	userId: "mara__li",
};

const AUTHOR_ID = "189390243676422144";

describe("replaceRollComment", () => {
	it("inserts a new comment line right after the mention when the roll had none", () => {
		const result: Resultat = { dice: "1d20", result: "1d20: [10] = 10", total: 10 };
		const res = new ResultAsText(result, DATA);
		const original = res.onMessageSend(undefined, AUTHOR_ID);
		const originalLines = original.split("\n");

		const updated = replaceRollComment(original, "nouveau commentaire");
		expect(updated).toBeDefined();
		const updatedLines = updated!.split("\n");

		expect(updatedLines).toHaveLength(originalLines.length + 1);
		expect(updatedLines[0]).toBe(originalLines[0]);
		expect(updatedLines[1]).toBe(" *nouveau commentaire*");
		expect(updatedLines.slice(2)).toEqual(originalLines.slice(1));
	});

	it("replaces an existing comment in place, leaving the dice lines untouched", () => {
		const result: Resultat = {
			comment: "ancien",
			dice: "1d20",
			result: "1d20: [10] = 10",
			total: 10,
		};
		const res = new ResultAsText(result, DATA);
		const original = res.onMessageSend(undefined, AUTHOR_ID);
		const originalLines = original.split("\n");
		expect(originalLines[1]).toContain("*ancien*");

		const updated = replaceRollComment(original, "nouveau");
		const updatedLines = updated!.split("\n");

		expect(updatedLines).toHaveLength(originalLines.length);
		expect(updatedLines[1]).toBe(" *nouveau*");
		expect(updatedLines.slice(2)).toEqual(originalLines.slice(2));
	});

	it("appends the comment to a lone infoRoll header line instead of inserting a new one", () => {
		const result: Resultat = { dice: "1d45", result: "1d45: [33] = 33", total: 33 };
		const res = new ResultAsText(result, DATA, undefined, undefined, {
			name: "Dexterite",
			standardized: "dexterite",
		});
		const original = res.onMessageSend(undefined, AUTHOR_ID);
		const originalLines = original.split("\n");
		expect(originalLines[1].trim()).toBe("[__Dexterite__]");

		const updated = replaceRollComment(original, "avec un bonus");
		const updatedLines = updated!.split("\n");

		expect(updatedLines).toHaveLength(originalLines.length);
		expect(updatedLines[1]).toBe(`${originalLines[1]} *avec un bonus*`);
		expect(updatedLines.slice(2)).toEqual(originalLines.slice(2));
	});

	it("replaces the comment when it shares a line with the infoRoll header", () => {
		const result: Resultat = {
			comment: "cc",
			dice: "1d45 /* cc */",
			result: "1d45: [12] = 12",
			total: 12,
		};
		const res = new ResultAsText(result, DATA, undefined, undefined, {
			name: "Dexterite",
			standardized: "dexterite",
		});
		const original = res.onMessageSend(undefined, AUTHOR_ID);
		const originalLines = original.split("\n");
		expect(originalLines[1]).toBe("[__Dexterite__] *cc*");

		const updated = replaceRollComment(original, "nouveau");
		const updatedLines = updated!.split("\n");

		expect(updatedLines).toHaveLength(originalLines.length);
		expect(updatedLines[1]).toBe("[__Dexterite__] *nouveau*");
		expect(updatedLines.slice(2)).toEqual(originalLines.slice(2));
	});

	it("sanitizes the incoming reply text (newlines, leading #, stray asterisks)", () => {
		const result: Resultat = { dice: "1d20", result: "1d20: [10] = 10", total: 10 };
		const res = new ResultAsText(result, DATA);
		const original = res.onMessageSend(undefined, AUTHOR_ID);

		const updated = replaceRollComment(original, "# damage\nreally *strong*");
		expect(updated!.split("\n")[1]).toBe(" *damage really \\*strong\\**");
	});

	it("returns undefined for an empty (or whitespace-only) reply", () => {
		const result: Resultat = { dice: "1d20", result: "1d20: [10] = 10", total: 10 };
		const res = new ResultAsText(result, DATA);
		const original = res.onMessageSend(undefined, AUTHOR_ID);

		expect(replaceRollComment(original, "   ")).toBeUndefined();
	});

	it("returns undefined for content that isn't a recognizable roll message", () => {
		expect(replaceRollComment("just one line", "comment")).toBeUndefined();
	});
});
