import type { EClient } from "@dicelette/client";
import type { DBCount, Translation } from "@dicelette/types";
import { fontPath } from "@dicelette/utils";
import { loadImage } from "canvas";
import type { ChartConfiguration, ChartOptions, Plugin } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import * as Djs from "discord.js";
import type { LeaderBoardRow } from "./types";

export function normalizeGuildCount(guildCount: DBCount): LeaderBoardRow[] {
	return Object.entries(guildCount).map(([userId, data]) => {
		const success = data?.success ?? 0;
		const failure = data?.failure ?? 0;
		const criticalSuccess = data?.criticalSuccess ?? 0;
		const criticalFailure = data?.criticalFailure ?? 0;
		return {
			userId,
			success,
			failure,
			criticalSuccess,
			criticalFailure,
			total: success + failure,
		};
	});
}

async function buildLeaderBoardChart(
	interaction: Djs.ChatInputCommandInteraction,
	rows: LeaderBoardRow[],
	ul: Translation
) {
	const resolvedRows = await Promise.all(
		rows
			.filter((row) => row.total > 0)
			.map(async (row) => {
				let member = interaction.guild!.members.cache.get(row.userId);
				if (!member) {
					member =
						(await interaction.guild!.members.fetch(row.userId).catch(() => null)) ??
						undefined;
				}
				return { member, row };
			})
	);

	const top10 = resolvedRows
		.filter(
			(item): item is { member: Djs.GuildMember; row: LeaderBoardRow } => !!item.member
		)
		.sort((a, b) => b.row.total - a.row.total)
		.slice(0, 10);

	const top10Display = top10.map(({ member }, i) => {
		const displayName = member.user.globalName ?? member.user.username;
		const safeName =
			displayName.length > 16 ? `${displayName.slice(0, 13)}...` : displayName;
		const avatarUrl =
			member.displayAvatarURL({ extension: "png", forceStatic: true, size: 64 }) ?? null;

		return { avatarUrl, label: `${i + 1}. ${safeName}` };
	});

	const labels = top10Display.map((item) => item.label);
	const avatarImages = await Promise.all(
		top10Display.map(async (item) => {
			if (!item.avatarUrl) return null;
			return loadImage(item.avatarUrl).catch(() => null);
		})
	);

	const data = {
		labels,
		datasets: [
			{
				label: ul("roll.success"),
				data: top10.map(({ row }) => row.success - row.criticalSuccess),
				backgroundColor: "rgba(34,197,94,0.8)",
				borderColor: "rgba(22,163,74,1)",
				borderWidth: 1,
				stack: "karma",
			},
			{
				label: ul("roll.critical.success"),
				data: top10.map(({ row }) => row.criticalSuccess),
				backgroundColor: "rgba(250,204,21,0.9)",
				borderColor: "rgba(202,138,4,1)",
				borderWidth: 1,
				stack: "karma",
			},
			{
				label: ul("roll.failure"),
				data: top10.map(({ row }) => row.failure - row.criticalFailure),
				backgroundColor: "rgba(239,68,68,0.8)",
				borderColor: "rgba(220,38,38,1)",
				borderWidth: 1,
				stack: "karma",
			},
			{
				label: ul("roll.critical.failure"),
				data: top10.map(({ row }) => row.criticalFailure),
				backgroundColor: "rgba(139,92,246,0.9)",
				borderColor: "rgba(109,40,217,1)",
				borderWidth: 1,
				stack: "karma",
			},
		],
	};

	const chartOption: ChartOptions<"bar"> = {
		responsive: false,
		animation: false,
		maintainAspectRatio: false,
		layout: {
			padding: { top: 24, right: 24, bottom: 110, left: 12 },
		},
		plugins: {
			legend: {
				display: true,
				position: "top",
				labels: {
					boxHeight: 14,
					boxWidth: 14,
					color: "#e5e7eb",
					usePointStyle: true,
				},
			},
			title: {
				display: true,
				text: ul("luckerMeter.leaderboard.title").toTitle(),
				color: "#f9fafb",
				font: { family: "Jost", size: 42, weight: "bold" },
				padding: { bottom: 8 },
			},
			subtitle: {
				display: true,
				text: "Top 10",
				color: "#9ca3af",
			},
		},
		scales: {
			x: {
				stacked: true,
				ticks: { display: false },
				grid: { display: false },
			},
			y: {
				stacked: true,
				beginAtZero: true,
				ticks: { color: "#d1d5db", precision: 0 },
				grid: { color: "rgba(255,255,255,0.08)" },
			},
		},
	};

	const renderer = new ChartJSNodeCanvas({
		width: 1400,
		height: 900,
	});
	renderer.registerFont(fontPath("Jost-Regular"), { family: "Jost", weight: "700" });
	renderer.registerFont(fontPath("Ubuntu-Regular"), { family: "Ubuntu" });

	const avatarPlugin: Plugin<"bar"> = {
		id: "karma-avatar-labels",
		afterDraw(chart) {
			const xScale = chart.scales.x;
			if (!xScale) return;

			const radius = 16;
			const labelsY = chart.chartArea.bottom + 38;
			const { ctx } = chart;
			for (let i = 0; i < top10.length; i++) {
				const label = labels[i] ?? "";
				const xCenter = xScale.getPixelForValue(i);
				const avatar = avatarImages[i];

				ctx.save();
				ctx.font = "700 30px Ubuntu";
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillStyle = "#d1d5db";

				const textWidth = ctx.measureText(label).width;
				const avatarX = xCenter - textWidth / 2 - radius * 2 - 10;
				const avatarY = labelsY - radius;

				if (avatar) {
					ctx.beginPath();
					ctx.arc(avatarX + radius, avatarY + radius, radius + 1, 0, Math.PI * 2);
					ctx.fillStyle = "rgba(17,24,39,0.9)";
					ctx.fill();

					ctx.beginPath();
					ctx.arc(avatarX + radius, avatarY + radius, radius, 0, Math.PI * 2);
					ctx.closePath();
					ctx.clip();
					ctx.drawImage(avatar, avatarX, avatarY, radius * 2, radius * 2);
					ctx.restore();
					ctx.save();
					ctx.font = "700 30px Ubuntu";
					ctx.textAlign = "left";
					ctx.textBaseline = "middle";
					ctx.fillStyle = "#d1d5db";
				}

				ctx.fillText(label, avatarX + radius * 2 + 10, labelsY);
				ctx.restore();
			}
		},
	};

	const valueLabelsPlugin: Plugin<"bar"> = {
		id: "karma-value-labels",
		afterDatasetsDraw(chart) {
			const { ctx } = chart;
			ctx.save();
			ctx.font = "700 20px Ubuntu";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			for (
				let datasetIndex = 0;
				datasetIndex < chart.data.datasets.length;
				datasetIndex++
			) {
				const dataset = chart.data.datasets[datasetIndex];
				const meta = chart.getDatasetMeta(datasetIndex);
				if (meta.hidden) continue;

				for (let i = 0; i < meta.data.length; i++) {
					const bar = meta.data[i] as unknown as {
						base: number;
						x: number;
						y: number;
					};
					const rawValue = dataset.data[i] as number | null | undefined;
					const value = rawValue ?? 0;
					if (value <= 0) continue;

					const segmentHeight = Math.abs(bar.base - bar.y);
					if (segmentHeight < 14) continue;

					ctx.lineWidth = 3;
					ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
					ctx.lineJoin = "round"; // rend le contour plus propre
					ctx.strokeText(`${value}`, bar.x, bar.y + (bar.base - bar.y) / 2);

					ctx.fillStyle = "#ffffff";
					ctx.fillText(`${value}`, bar.x, bar.y + (bar.base - bar.y) / 2);
				}
			}

			ctx.restore();
		},
	};

	return renderer.renderToBuffer({
		type: "bar",
		data,
		options: chartOption,
		plugins: [valueLabelsPlugin, avatarPlugin],
	} as ChartConfiguration<"bar">);
}

/**
 * Goal : Create a graph (whichtype) for karma
 * @param interaction
 * @param client
 * @param ul
 */
export async function graph(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const guildCount = client.criticalCount.get(interaction.guild!.id);
	if (!guildCount) {
		await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
		return;
	}
	const rows = normalizeGuildCount(guildCount);

	const hasData = rows.some((row) => row.total > 0);
	if (!hasData) {
		await interaction.editReply({ content: ul("luckMeter.leaderboard.noData") });
		return;
	}

	const chartBuffer = await buildLeaderBoardChart(interaction, rows, ul);
	const file = new Djs.AttachmentBuilder(chartBuffer, { name: "karma_leaderboard.png" });
	await interaction.editReply({
		files: [file],
		allowedMentions: { parse: [], repliedUser: false, roles: [], users: [] },
	});
}
