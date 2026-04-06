import type { UserData } from "@dicelette/types";
import { fontPath } from "@dicelette/utils";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import * as Djs from "discord.js";
import parse from "parse-color";

export async function chart(
	userData: UserData,
	labels: string[],
	lineColor = "#FF0000",
	fillColor = "#FF0000",
	min?: number,
	max?: number,
	invert = false
) {
	if (!userData.stats) return;

	let statsValues = Object.values(userData.stats);
	const autoMin = Math.min(...statsValues);
	const autoMax = Math.max(...statsValues);
	const userMinDefined = min !== undefined;
	const userMaxDefined = max !== undefined;
	let finalMin = min ?? autoMin;
	let finalMax = max ?? autoMax;

	if (invert) {
		statsValues = statsValues.map((v) => finalMax - (v - finalMin));
		finalMin = finalMax - autoMax;
		finalMax = finalMax - autoMin;
	}
	const data = {
		datasets: [
			{
				backgroundColor: fillColor,
				borderColor: lineColor,
				data: statsValues,
				fill: true,
				pointStyle: "cross",
			},
		],
		labels: labels.map((key) => key.capitalize()),
	};
	const steps = 4;
	const options = {
		aspectRatio: 1,
		elements: {
			line: {
				borderWidth: 1,
			},
		},
		plugins: {
			legend: {
				display: false,
			},
		},
		scales: {
			r: {
				angleLines: {
					color: "darkgrey",
					display: true,
					lineWidth: 2,
				},
				grid: {
					borderDash: [10, 10],
					circular: true,
					color: "darkgrey",
					lineWidth: 1,
				},
				pointLabels: {
					centerPointLabels: false,
					color: "darkgrey",
					display: true,
					font: {
						family: "Jost",
						size: 30,
						weight: "700",
					},
				},
				...(userMaxDefined ? { max: finalMax } : { suggestedMax: finalMax }),
				...(userMinDefined ? { min: finalMin } : { suggestedMin: finalMin }),
				ticks: {
					centerPointLabels: true,
					color: "darkgrey",
					display: false,
					font: {
						family: "Ubuntu",
						size: 30,
					},
					showLabelBackdrop: false,
					stepSize: steps,
					z: 100,
				},
			},
		},
	};
	const renderer = new ChartJSNodeCanvas({ height: 800, width: 800 });
	renderer.registerFont(fontPath("Jost-Regular"), {
		family: "Jost",
		weight: "700",
	});
	renderer.registerFont(fontPath("Ubuntu-Regular"), { family: "Ubuntu" });
	return await renderer.renderToBuffer({
		data,
		options,
		type: "radar",
	});
}

export function generateColor(line: string | null, background: string | null) {
	if (line && !background) {
		background = convertHexToRGBA(line, 0.5);
	} else if (!line && background) {
		line = convertHexToRGBA(background, 1);
	} else if (!line && !background) {
		line = "#0e47b2";
		background = "#0e47b2";
	}
	line = convertHexToRGBA(line as string, 1);
	background = convertHexToRGBA(background as string, 0.5);
	return { background, line };
}

export function convertHexToRGBA(color: string, alpha?: number) {
	const parsedColor = parse(color);
	if (alpha) {
		parsedColor.rgba[parsedColor.rgba.length - 1] = alpha;
	}
	return `rgba(${parsedColor.rgba.join(", ")})`;
}

export async function imagePersonalized(
	stat: UserData,
	labels: string[],
	lineColor?: string,
	fillColor?: string,
	min?: number,
	max?: number,
	invert?: boolean
) {
	const charGraph = await chart(stat, labels, lineColor, fillColor, min, max, invert);
	if (!charGraph) return;
	return new Djs.AttachmentBuilder(charGraph);
}
