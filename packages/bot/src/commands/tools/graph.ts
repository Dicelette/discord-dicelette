import path from "node:path";
import type { CharacterData, PersonnageIds, UserData } from "@dicelette:types/database";
import { cmdLn, ln, t } from "@dicelette/localization";
import { logger } from "@dicelette/utils";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { EClient } from "client";
import { getTemplateWithDB } from "database/get_template";
import { findChara, getDatabaseChar, getUserByEmbed } from "database/get_user";
import * as Djs from "discord.js";
import { sendLogs } from "messages/send";
import parse from "parse-color";
import { embedError, filterChoices, haveAccess, reply } from "utils";
import { searchUserChannel } from "utils/search";

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
	data: new Djs.SlashCommandBuilder()
		.setName(t("graph.name"))
		.setDefaultMemberPermissions(0)
		.setNameLocalizations(cmdLn("graph.name"))
		.setDescription(t("graph.description"))
		.setDescriptionLocalizations(cmdLn("graph.description"))
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("display.user"))
				.setDescriptionLocalizations(cmdLn("display.user"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescription(t("display.character"))
				.setDescriptionLocalizations(cmdLn("display.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
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
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
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
		const guildData = client.settings.get(interaction.guild!.id);
		let min = options.getNumber(t("graph.min.name")) ?? undefined;
		let max = options.getNumber(t("graph.max.name")) ?? undefined;
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const serverTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildData.templateID.statsName || !serverTemplate?.statistics) {
			await reply(interaction, { embeds: [embedError(ul("error.noStats"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charData = await getDatabaseChar(interaction, client, t);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		let userName = `<@${user?.id ?? interaction.user.id}>`;
		if (charName) userName += ` (${charName})`;
		if (!charData) {
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
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
			const userStatistique = getUserByEmbed(message, ul, undefined, false);
			if (!userStatistique) {
				await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
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
			await reply(interaction, { content: titleUser(), files: [image] });
		} catch (error) {
			await reply(interaction, {
				embeds: [embedError(ul("error.generic.e", { e: error as Error }), ul)],
			});
			sendLogs(
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
