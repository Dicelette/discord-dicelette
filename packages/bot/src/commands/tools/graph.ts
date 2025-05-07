import path from "node:path";
import { cmdLn, t } from "@dicelette/localization";
import type { CharacterData, PersonnageIds, UserData } from "@dicelette/types";
import { filterChoices, logger } from "@dicelette/utils";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { EClient } from "client";
import {
	findChara,
	getRecordChar,
	getTemplateWithInteraction,
	getUserByEmbed,
} from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendLogs } from "messages";
import parse from "parse-color";
import { charUserOptions, getLangAndConfig, haveAccess, searchUserChannel } from "utils";

async function chart(
	userData: UserData,
	labels: string[],
	lineColor = "#FF0000",
	fillColor = "#FF0000",
	min?: number,
	max?: number
) {
	if (!userData.stats) return;
	const data = {
		labels: labels.map((key) => key.capitalize()),
		datasets: [
			{
				data: Object.values(userData.stats),
				fill: true,
				backgroundColor: fillColor,
				borderColor: lineColor,
				pointStyle: "cross",
			},
		],
	};
	const steps = 4;
	const options = {
		elements: {
			line: {
				borderWidth: 1,
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
					color: "darkgrey",
					circular: true,
					lineWidth: 1,
					borderDash: [10, 10],
				},
				ticks: {
					stepSize: steps,
					display: false,
					color: "darkgrey",
					showLabelBackdrop: false,
					centerPointLabels: true,
					font: {
						family: "Ubuntu",
						size: 30,
					},
					z: 100,
				},
				pointLabels: {
					color: "darkgrey",
					font: {
						size: 30,
						family: "Jost",
						weight: "700",
					},
					display: true,
					centerPointLabels: false,
				},
				suggestedMin: min,
				suggestedMax: max,
			},
		},
		plugins: {
			legend: {
				display: false,
			},
		},
		aspectRatio: 1,
	};
	const renderer = new ChartJSNodeCanvas({ width: 800, height: 800 });
	renderer.registerFont(fontPath("Jost-Regular"), { family: "Jost", weight: "700" });
	renderer.registerFont(fontPath("Ubuntu-Regular"), { family: "Ubuntu" });
	return await renderer.renderToBuffer({
		type: "radar",
		data,
		options,
	});
}

function fontPath(fontName: string) {
	return path.resolve(`assets/fonts/${fontName}.ttf`).replace("dist/", "");
}

export const graph = {
	data: (charUserOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setName(t("graph.name"))
		.setDefaultMemberPermissions(0)
		.setNameLocalizations(cmdLn("graph.name"))
		.setDescription(t("graph.description"))
		.setDescriptionLocalizations(cmdLn("graph.description"))

		.addStringOption((option) =>
			option
				.setName(t("graph.line.name"))
				.setDescription(t("graph.line.description"))
				.setDescriptionLocalizations(cmdLn("graph.line.description"))
				.setNameLocalizations(cmdLn("graph.line.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("graph.min.name"))
				.setDescription(t("graph.min.description"))
				.setDescriptionLocalizations(cmdLn("graph.min.description"))
				.setNameLocalizations(cmdLn("graph.min.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("graph.max.name"))
				.setDescription(t("graph.max.description"))
				.setRequired(false)
				.setDescriptionLocalizations(cmdLn("graph.max.description"))
				.setNameLocalizations(cmdLn("graph.max.name"))
		)
		.addStringOption((option) =>
			option
				.setName(t("graph.bg.name"))
				.setDescription(t("graph.bg.description"))
				.setNameLocalizations(cmdLn("graph.bg.name"))
				.setDescriptionLocalizations(cmdLn("graph.bg.description"))
				.setRequired(false)
		),
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		const { ul } = getLangAndConfig(client.settings, interaction);
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
				const allowed = haveAccess(interaction, data.messageId[1], user);
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
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		if (!interaction.guild) return;
		let min = options.getNumber(t("graph.min.name")) ?? undefined;
		let max = options.getNumber(t("graph.max.name")) ?? undefined;
		const { ul, config: guildData } = getLangAndConfig(client.settings, interaction);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.template.notFound"), ul)] });
			return;
		}
		const serverTemplate = await getTemplateWithInteraction(interaction, client);
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
			if (!userData) {
				userData = await findChara(charData, charName);
			}
			if (!userData) {
				await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
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
					embeds: [embedError(ul("error.noThread"), ul)],
				});

			const allowHidden = haveAccess(interaction, thread.id, userId);
			if (!allowHidden && charData[userId]?.isPrivate) {
				await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
				return;
			}

			const message = await thread.messages.fetch(sheetLocation.messageId);
			const userStatistique = getUserByEmbed({ message }, ul, undefined, false);
			if (!userStatistique) {
				await reply(interaction, { embeds: [embedError(ul("error.user.notFound"), ul)] });
				return;
			}
			if (!userStatistique.stats) {
				await reply(interaction, { embeds: [embedError(ul("error.noStats"), ul)] });
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

			if (serverTemplate?.statistics && (!min || !max)) {
				if (!min) {
					const allMin = Object.values(serverTemplate.statistics)
						.map((stat) => {
							if (stat.min == null) return 0;
							return stat.min;
						})
						.filter((min) => min > 0);
					if (allMin.length > 0) min = Math.min(...allMin);
				}
				if (!max) {
					const allMax = Object.values(serverTemplate.statistics).map((stat) => {
						if (stat.max == null) return 0;
						return stat.max;
					});
					max = Math.max(...allMax);
				}

				if (min === 0) min = undefined;
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
			}
			const image = await imagePersonalized(
				userStatistique,
				filteredLabels,
				color.line,
				color.background,
				min,
				max
			);
			if (!image) {
				await reply(interaction, { embeds: [embedError(ul("error.noMessage"), ul)] });
				return;
			}
			await reply(interaction, {
				content: titleUser(),
				files: [image],
				allowedMentions: { repliedUser: true, users: [] },
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
	return { line, background };
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
	max?: number
) {
	const charGraph = await chart(stat, labels, lineColor, fillColor, min, max);
	if (!charGraph) return;
	return new Djs.AttachmentBuilder(charGraph);
}
