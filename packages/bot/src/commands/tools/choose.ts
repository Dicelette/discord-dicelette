import * as Djs from "discord.js";
import "discord_ext";
import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { logger, random } from "@dicelette/utils";

const REPEAT_CHOOSE = /(?<word>.*?)\* ?(?<repeat>\d+)/;

export const choose = {
	data: new Djs.SlashCommandBuilder()
		.setNames("choose.name")
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescriptions("choose.description")
		.addStringOption((option) =>
			option
				.setNames("choose.list.name")
				.setDescriptions("choose.list.description")
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setNames("choose.number.name")
				.setDescriptions("choose.number.description")
				.setRequired(false)
		),

	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		await command(interaction, client);
	},
};

function separator(input: string) {
	const sep = /[,;|]/;
	if (input.match(sep)) return sep;
	return /\s+/;
}

function weight(input: string[]): string[] {
	const results: string[] = [];
	for (const item of input) {
		const match = REPEAT_CHOOSE.exec(item);
		if (match?.groups) {
			const word = match.groups.word.trim();
			const repeat = Number.parseInt(match.groups.repeat, 10);
			results.push(...Array(repeat).fill(word));
			continue;
		}
		results.push(item);
	}
	return results;
}

async function command(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
	const list = interaction.options.getString(t("choose.list.name"), true);
	const howMany = interaction.options.getInteger(t("choose.number.name"), false);
	const { ul } = getLangAndConfig(client, interaction);
	const hasWeight = REPEAT_CHOOSE.test(list);
	let items = list
		.split(separator(list))
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	if (hasWeight) items = weight(items);

	logger.debug("Choose command items:", items);

	if (items.length === 0)
		return await interaction.reply({
			content: ul("choose.noItems"),
			flags: Djs.MessageFlags.Ephemeral,
		});

	if (howMany && howMany > items.length)
		return await interaction.reply({
			content: ul("choose.tooMany", { count: items.length }),
			flags: Djs.MessageFlags.Ephemeral,
		});

	const selected = random.sample(items, howMany ?? 1);
	await interaction.reply({
		content: ul("choose.result", {
			items: selected.map((x) => `\`${x}\``).join(", "),
		}),
	});
}
