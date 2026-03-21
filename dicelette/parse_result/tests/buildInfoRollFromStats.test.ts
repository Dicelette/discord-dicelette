import { describe, expect, it } from "vitest";
import { buildInfoRollFromStats } from "../src/dice_extractor";

describe("buildInfoRollFromStats", () => {
	it("returns undefined when no stats found", () => {
		expect(buildInfoRollFromStats(undefined, undefined)).toBeUndefined();
		expect(buildInfoRollFromStats([], [])).toBeUndefined();
	});

	it("joins found stats into name and standardized", () => {
		const res = buildInfoRollFromStats(["force", "dexterite"], undefined);
		expect(res).toEqual({
			name: "force dexterite",
			standardized: "force dexterite".standardize(),
		});
	});

	it("restores accents using statsName list", () => {
		const statsFound = ["eloquence", "sagesse"];
		const statsName = ["Éloquence", "Sagesse", "Force"]; // include originals
		const res = buildInfoRollFromStats(statsFound, statsName);
		expect(res).toEqual({
			name: "Éloquence Sagesse",
			standardized: "Éloquence Sagesse".standardize(),
		});
	});

	it("falls back to found stats when no match in statsName", () => {
		const statsFound = ["inconnue"];
		const statsName: string[] = ["Éloquence", "Sagesse"]; // no match
		const res = buildInfoRollFromStats(statsFound, statsName);
		expect(res).toEqual({
			name: "inconnue",
			standardized: "inconnue".standardize(),
		});
	});
});
