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
	expect(res).toEqual(["perception", "bludgeoning", "cutting", "coffee"]);
});

it("Should remove all damages stats", () => {
	const statistics = ["Agility", "Force", "Endurance", "coffee"];
	const res = filterStatsInDamage(DAMAGES, statistics);
	expect(res).toEqual(["perception"]);
});
