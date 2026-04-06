import type { Statistic, StatisticalTemplate } from "@dicelette/core";

export function getMin(statistics: Statistic): number | undefined {
	let min: number | undefined;
	const allMin = Object.values(statistics)
		.map((stat) => {
			if (stat.min == null) return 0;
			return stat.min;
		})
		.filter((min) => min > 0);
	if (allMin.length > 0) min = Math.min(...allMin);

	if (min === 0) return undefined;
	return min;
}

export function getMax(serverTemplate: StatisticalTemplate): number | undefined {
	let max: number | undefined;
	const allMax = Object.values(serverTemplate!.statistics as Statistic).map((stat) => {
		if (stat.max == null) return 0;
		return stat.max;
	});
	max = Math.max(...allMax);
	if (max === 0) {
		if (serverTemplate.critical?.success) {
			max = serverTemplate.critical.success;
		} else if (serverTemplate.diceType) {
			const comparatorRegex = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(
				serverTemplate.diceType
			);
			if (comparatorRegex?.groups?.comparator) {
				max = Number.parseInt(comparatorRegex.groups.comparator, 10);
			} else {
				const diceMatch = /d(?<face>\d+)/.exec(serverTemplate.diceType);
				max = diceMatch?.groups?.face
					? Number.parseInt(diceMatch.groups.face, 10)
					: undefined;
			}
		}
	} else max = undefined;
	if (max === 0) return undefined;
	return max;
}
