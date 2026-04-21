import type { EClient } from "@dicelette/client";
import { findBestStatMatch, isNumber, MIN_THRESHOLD_MATCH } from "@dicelette/core";
import {
	charUserOptions,
	getInteractionContext as getLangAndConfig,
	haveAccess,
	resolveUserAttributes,
} from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import { normalizeStatsMap } from "@dicelette/parse_result";
import type {
	CharacterData,
	PersonnageIds,
	Translation,
	UserData,
} from "@dicelette/types";
import { filterChoices, logger, sentry } from "@dicelette/utils";
import {
	findChara,
	getRecordChar,
	getTemplateByInteraction,
	getUserByEmbed,
} from "database";
import * as Djs from "discord.js";
import { embedError, reply, sendLogs } from "messages";
import { searchUserChannel } from "utils";
import "@dicelette/discord_ext";
import { generateColor, imagePersonalized } from "./draw";
import { getMax, getMin } from "./utils";

function chartOptions(builder: Djs.SlashCommandSubcommandBuilder, attribute?: boolean) {
	builder
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
		);
	if (attribute) {
		builder.addStringOption((option) =>
			option
				.setNames("userSettings.attributes.title")
				.setDescriptions("graph.attributes.options")
				.setRequired(false)
		);
	}
	return builder;
}

function parseRequestedAttributes(attributesFilter: string) {
	return attributesFilter
		.split(/[;,\n]/)
		.map((attribute) => attribute.trim())
		.filter((attribute) => attribute.length > 0);
}

function selectAttributes(
	attributes: Record<string, number>,
	attributesFilter?: string | null
) {
	if (!attributesFilter?.trim()) return attributes;

	const normalizedAttributes = normalizeStatsMap(attributes);
	const selectedAttributes: string[] = [];
	const selectedAttributeSet = new Set<string>();

	for (const attribute of parseRequestedAttributes(attributesFilter)) {
		const normalizedAttribute = attribute.standardize();
		const exact = normalizedAttributes.get(normalizedAttribute)?.[0];
		const match =
			exact ??
			findBestStatMatch<[string, number]>(
				normalizedAttribute,
				normalizedAttributes,
				MIN_THRESHOLD_MATCH
			)?.[0];
		if (!match || selectedAttributeSet.has(match)) continue;
		selectedAttributes.push(match);
		selectedAttributeSet.add(match);
	}

	return selectedAttributes.reduce(
		(acc, key) => {
			acc[key] = attributes[key] as number;
			return acc;
		},
		{} as Record<string, number>
	);
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
	data: new Djs.SlashCommandBuilder()
		.setNames("graph.name")
		.setDefaultMemberPermissions(0)
		.setDescriptions("graph.description")
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setContexts(Djs.InteractionContextType.Guild)
		.addSubcommand((subcommand) =>
			(charUserOptions(chartOptions(subcommand)) as Djs.SlashCommandSubcommandBuilder)
				.setNames("common.statistic")
				.setDescriptions("graph.statistic")
		)
		.addSubcommand((subcommand) =>
			(
				charUserOptions(
					chartOptions(subcommand, true)
				) as Djs.SlashCommandSubcommandBuilder
			)
				.setNames("userSettings.attributes.title")
				.setDescriptions("graph.attributes.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		await interaction.deferReply();
		const subcommand = interaction.options.getSubcommand(true);
		switch (subcommand) {
			case t("common.statistic"):
				await graphStats(client, interaction);
				break;
			case t("userSettings.attributes.title"):
				await graphAttributes(client, interaction);
				break;
		}
	},
};

async function graphStats(client: EClient, interaction: Djs.ChatInputCommandInteraction) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	let min = options.getNumber(t("graph.min.name")) ?? undefined;
	let max = options.getNumber(t("graph.max.name")) ?? undefined;
	const { ul, config: guildData } = getLangAndConfig(client, interaction);
	if (!guildData) {
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.template.notFound", { guildId: interaction.guild!.name }),
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
		if (userData && !userData.userId) userData.userId = userId;
		if (!userData) userData = findChara(charData, charName);

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

		const allowHidden = await haveAccess(
			interaction,
			thread.id,
			userData.userId ?? userId
		);
		if (!allowHidden && userData.isPrivate) {
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
			key.unidecode(true)
		);
		const filteredLabels = labels.filter((label) =>
			userStatKeys.includes(label.unidecode(true))
		);
		//remove combined stats
		const lineColor = options.getString(t("graph.line.name"));
		const fillColor = options.getString(t("graph.bg.name"));
		const color = generateColor(lineColor, fillColor);
		const invert = options.getBoolean(t("graph.invert.name"), false) ?? false;

		if (serverTemplate?.statistics) {
			if (min === undefined) min = getMin(serverTemplate.statistics);
			if (max === undefined) max = getMax(serverTemplate);
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
		return await graphError(interaction, error as Error, ul, client);
	}
}

async function graphAttributes(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	let min = options.getNumber(t("graph.min.name")) ?? undefined;
	let max = options.getNumber(t("graph.max.name")) ?? undefined;
	const { ul } = getLangAndConfig(client, interaction);

	try {
		if (!interaction.guild) return;
		const user = options.getUser(t("display.userLowercase"));
		const userId = user?.id ?? interaction.user.id;

		// Get attributes from user settings
		const userAttributes =
			client.userSettings.get(interaction.guild.id, userId)?.attributes ?? {};
		const resolvedAttributes = resolveUserAttributes(userAttributes);
		if (!resolvedAttributes.ok || !resolvedAttributes.value) {
			await reply(interaction, {
				embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
			});
			return;
		}
		if (Object.keys(resolvedAttributes.value).length === 0) {
			await reply(interaction, {
				embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
			});
			return;
		}

		const attributesFilter = options
			.getString(t("userSettings.attributes.title"))
			?.trim();
		const filteredAttributes = selectAttributes(
			resolvedAttributes.value,
			attributesFilter
		);
		if (attributesFilter && Object.keys(filteredAttributes).length === 0) {
			await reply(interaction, {
				embeds: [embedError(ul("error.stats.notFound_plural"), ul)],
			});
			return;
		}

		const labels = Object.keys(filteredAttributes).map((key) => key.unidecode(true));
		const values = Object.values(filteredAttributes);

		function filterToNumber(values: unknown[]) {
			return values.filter((v) => isNumber(v)).map((v) => Number(v));
		}
		// Adjust min/max based on found values if not provided
		if (min === undefined) min = Math.min(...filterToNumber(values));
		if (max === undefined && values.length > 0) {
			max = Math.max(...filterToNumber(values));
		}

		const lineColor = options.getString(t("graph.line.name"));
		const fillColor = options.getString(t("graph.bg.name"));
		const color = generateColor(lineColor, fillColor);
		const invert = options.getBoolean(t("graph.invert.name"), false) ?? false;

		const image = await imagePersonalized(
			{ stats: filteredAttributes } as UserData,
			labels,
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

		const titleUser = `# ⌈${Djs.userMention(userId)}⌋ `;
		await reply(interaction, {
			allowedMentions: { repliedUser: true, users: [] },
			content: titleUser,
			files: [image],
		});
	} catch (error) {
		return await graphError(interaction, error as Error, ul, client);
	}
}

async function graphError(
	interaction: Djs.ChatInputCommandInteraction,
	error: Error,
	ul: Translation,
	client: EClient
) {
	await reply(interaction, {
		embeds: [embedError(ul("error.generic.e", { e: error }), ul)],
	});
	await sendLogs(
		ul("error.generic.e", { e: error as Error }),
		interaction.guild!,
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
