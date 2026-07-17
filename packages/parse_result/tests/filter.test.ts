import { expect, it } from "vitest";
import { filterStatsInDamage } from "../src/utils";

const DAMAGES = {
	bludgeoning: "1dForce",
	coffee: "1d100+coffee",
	cutting: "1dEndurance",
	perception: "1d100",
	piercing: "Agilityd100",
};
it("Should keep everything", () => {
	const statistics: string[] = [];
	const res = filterStatsInDamage(DAMAGES, statistics);
	expect(res).toEqual(Object.keys(DAMAGES));
});

it("Should remove the unwanted", () => {
	const statistics = ["Agility"];
	const res = filterStatsInDamage(DAMAGES, statistics);
	expect(res).toEqual(["bludgeoning", "coffee", "cutting", "perception"]);
});

it("Should remove all damages stats", () => {
	const statistics = ["Agility", "Force", "Endurance", "coffee"];
	const res = filterStatsInDamage(DAMAGES, statistics);
	expect(res).toEqual(["perception"]);
});

it("Should treat regex metacharacters in stat names as literal text", () => {
	// A stat named "1d.00" must not act as the regex wildcard "." and match "1dX00".
	const damages = { safe: "1dX00", unsafe: "1d.00" };
	const res = filterStatsInDamage(damages, ["1d.00"]);
	expect(res).toEqual(["safe"]);
});

it("Should not hang on a stat name shaped like a catastrophic-backtracking regex", () => {
	const damages = { attack: `1d${"a".repeat(40)}!` };
	const start = performance.now();
	filterStatsInDamage(damages, ["(a+)+"]);
	expect(performance.now() - start).toBeLessThan(200);
});
