import path from "node:path";
import { charUserOptions, haveAccess } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { CharacterData, PersonnageIds, UserData } from "@dicelette/types";
import { filterChoices, logger, sentry } from "@dicelette/utils";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import {
	findChara,
	getRecordChar,
	getTemplateByInteraction,
	getUserByEmbed,
} from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendLogs } from "messages";
import parse from "parse-color";
import { searchUserChannel } from "utils";
import "discord_ext";
import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { Statistic, StatisticalTemplate } from "@dicelette/core";

async function chart(
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
				suggestedMax: finalMax,
				suggestedMin: finalMin,
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

function fontPath(fontName: string) {
	return path.resolve(`assets/fonts/${fontName}.ttf`).replace("dist/", "");
}

export const graph = {
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		const { ul } = getLangAndConfig(client, interaction);
		if (!guildData) return;
		const choices: string[] = [];
		let user = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof user !== "string") {
			user = interaction.user.id;
		}
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[user as string];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = await haveAccess(interaction, data.messageId[1], user);
				const toPush = data.charName ? data.charName : ul("common.default");
				if (!data.isPrivate) choices.push(toPush);
				else if (allowed) choices.push(toPush);
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	data: (charUserOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("graph.name")
		.setDefaultMemberPermissions(0)
		.setDescriptions("graph.description")
		.setContexts(Djs.InteractionContextType.Guild)
		.addBooleanOption((option) =>
			option
				.setNames("graph.invert.name")
				.setDescriptions("graph.invert.description")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setNames("graph.line.name")
				.setDescriptions("graph.line.description")
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setNames("graph.min.name")
				.setDescriptions("graph.min.description")
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setNames("graph.max.name")
				.setDescriptions("graph.max.description")
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setNames("graph.bg.name")
				.setDescriptions("graph.bg.description")
				.setRequired(false)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		if (!interaction.guild) return;
		await interaction.deferReply();
		let min = options.getNumber(t("graph.min.name")) ?? undefined;
		let max = options.getNumber(t("graph.max.name")) ?? undefined;
		const { ul, config: guildData } = getLangAndConfig(client, interaction);
		if (!guildData) {
			await reply(interaction, {
				embeds: [
					embedError(
						ul("error.template.notFound", { guildId: interaction.guild.name }),
						ul
					),
				],
			});
			return;
		}
		const serverTemplate = await getTemplateByInteraction(interaction, client);
		if (!guildData.templateID.statsName || !serverTemplate?.statistics) {
			await reply(interaction, {
				embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
			});
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charData = await getRecordChar(interaction, client, t);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		let userName = `<@${user?.id ?? interaction.user.id}>`;
		if (charName) userName += ` (${charName})`;
		if (!charData) {
			await reply(interaction, {
				embeds: [embedError(ul("error.user.registered", { user: userName }), ul)],
			});
			return;
		}
		try {
			if (!interaction.guild || !interaction.channel) return;
			const userId = user?.id ?? interaction.user.id;
			let userData: CharacterData | undefined = charData[userId];
			if (!userData) userData = await findChara(charData, charName);

			if (!userData) {
				await reply(interaction, {
					embeds: [embedError(ul("error.user.notFound.generic"), ul)],
				});
				return;
			}
			const sheetLocation: PersonnageIds = {
				channelId: userData.messageId[1],
				messageId: userData.messageId[0],
			};
			const thread = await searchUserChannel(
				client.settings,
				interaction,
				ul,
				sheetLocation?.channelId
			);
			if (!thread)
				return await reply(interaction, {
					embeds: [embedError(ul("error.channel.thread"), ul)],
				});

			const allowHidden = await haveAccess(interaction, thread.id, userId);
			if (!allowHidden && charData[userId]?.isPrivate) {
				await reply(interaction, {
					embeds: [embedError(ul("error.private"), ul)],
				});
				return;
			}

			const message = await thread.messages.fetch(sheetLocation.messageId);
			const userStatistique = getUserByEmbed({ message }, undefined, false);
			if (!userStatistique) {
				await reply(interaction, {
					embeds: [embedError(ul("error.user.notFound.generic"), ul)],
				});
				return;
			}
			if (!userStatistique.stats) {
				await reply(interaction, {
					embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
				});
				return;
			}
			const titleUser = () => {
				let msg = "# ";
				if (userData.charName) msg += `${userData.charName.capitalize()} `;
				msg += `⌈${Djs.userMention(userId)}⌋ `;
				return msg;
			};
			const labels = guildData.templateID.statsName;
			//only keep labels that exists in the user stats
			const userStatKeys = Object.keys(userStatistique.stats).map((key) =>
				key.unidecode()
			);
			const filteredLabels = labels.filter((label) =>
				userStatKeys.includes(label.unidecode())
			);
			//remove combined stats
			const lineColor = options.getString(t("graph.line.name"));
			const fillColor = options.getString(t("graph.bg.name"));
			const color = generateColor(lineColor, fillColor);
			const invert = options.getBoolean(t("graph.invert.name"), false) ?? false;

			if (serverTemplate?.statistics) {
				if (!min) min = getMin(serverTemplate.statistics);
				if (!max) max = getMax(serverTemplate);
			}

			const image = await imagePersonalized(
				userStatistique,
				filteredLabels,
				color.line,
				color.background,
				min,
				max,
				invert
			);
			if (!image) {
				await reply(interaction, {
					embeds: [embedError(ul("error.noMessage"), ul)],
				});
				return;
			}
			await reply(interaction, {
				allowedMentions: { repliedUser: true, users: [] },
				content: titleUser(),
				files: [image],
			});
		} catch (error) {
			await reply(interaction, {
				embeds: [embedError(ul("error.generic.e", { e: error as Error }), ul)],
			});
			await sendLogs(
				ul("error.generic.e", { e: error as Error }),
				interaction.guild,
				client.settings
			);
			logger.fatal(error);
			sentry.fatal(error, {
				interaction: {
					guildId: interaction.guild?.id,
					id: interaction.id,
					options: interaction.options.data,
					userId: interaction.user.id,
				},
			});
			return;
		}
	},
};

function generateColor(line: string | null, background: string | null) {
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

function convertHexToRGBA(color: string, alpha?: number) {
	const parsedColor = parse(color);
	if (alpha) {
		parsedColor.rgba[parsedColor.rgba.length - 1] = alpha;
	}
	return `rgba(${parsedColor.rgba.join(", ")})`;
}

async function imagePersonalized(
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

function getMin(statistics: Statistic): number | undefined {
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

function getMax(serverTemplate: StatisticalTemplate): number | undefined {
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
