import { expect, it } from "vitest";
import { filterStatsInDamage } from "../src/utils";
const damages = {
	perception: "1d100",
	piercing: "Agilityd100",
	bludgeoning: "1dForce",
	cutting: "1dEndurance",
	coffee: "1d100+coffee",
};
it("Should keep everything", () => {
	const statistics: string[] = [];
	const res = filterStatsInDamage(damages, statistics);
	expect(res).toEqual(Object.keys(damages));
});

it("Should remove the unwanted", () => {
	const statistics = ["Agility"];
	const res = filterStatsInDamage(damages, statistics);
	expect(res).toEqual(["perception", "bludgeoning", "cutting", "coffee"]);
});

it("Should remove all damages stats", () => {
	const statistics = ["Agility", "Force", "Endurance", "coffee"];
	const res = filterStatsInDamage(damages, statistics);
	expect(res).toEqual(["perception"]);
});
