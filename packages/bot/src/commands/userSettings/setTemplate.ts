import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import {
	DEFAULT_TEMPLATE,
	type TemplateResult,
	type Translation,
} from "@dicelette/types";
import dedent from "dedent";
import * as Djs from "discord.js";
import { merge } from "ts-deepmerge";
import { finalLink } from "../context_menus";

export async function setTemplate(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	guildOverride = false
) {
	const options = interaction.options;
	const getOpt = (name: string, required = false, def?: string) =>
		(options.getString(name, required) ?? def ?? "").replaceAll("\\s", " ");

	const template: TemplateResult = {
		final: getOpt(t("userSettings.createLink.final.name"), true),
		format: {
			character: getOpt(t("common.character"), false, DEFAULT_TEMPLATE.format.character),
			dice: getOpt(t("common.dice"), false, DEFAULT_TEMPLATE.format.dice),
			info: getOpt(
				t("userSettings.createLink.info.name"),
				false,
				DEFAULT_TEMPLATE.format.info
			),
			name: getOpt(t("common.name"), false, DEFAULT_TEMPLATE.format.name),
			originalDice: getOpt(
				t("userSettings.createLink.originalDice.name"),
				false,
				DEFAULT_TEMPLATE.format.originalDice
			),
		},
		joinResult: getOpt(
			t("userSettings.createLink.joinResult.name"),
			false,
			DEFAULT_TEMPLATE.joinResult
		),
		results: getOpt(
			t("userSettings.createLink.result.name"),
			false,
			DEFAULT_TEMPLATE.results
		),
	};

	if (!guildOverride) {
		const userKeys = `${interaction.user.id}.createLinkTemplate`;
		client.userSettings.set(interaction.guildId!, template, userKeys);
	} else client.settings.set(interaction.guildId!, template, "createLinkTemplate");

	const { ul } = getLangAndConfig(client, interaction);
	const preview = `\`\`${getTemplatePreview(ul, template)}\`\``;
	await interaction.reply({
		content: ul("userSettings.createLink.success", { preview }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export function resetTemplate(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	guildOverride = false
) {
	if (!guildOverride) {
		const userKeys = `${interaction.user.id}.createLinkTemplate`;
		client.userSettings.delete(interaction.guildId!, userKeys);
	} else {
		client.settings.delete(interaction.guildId!, "createLinkTemplate");
	}
	const { ul } = getLangAndConfig(client, interaction);
	return interaction.reply({
		content: ul("userSettings.createLink.reset.success"),
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export function getTemplatePreview(ul: Translation, template?: TemplateResult) {
	const diceletteText = `__**${ul("common.character").toTitle()}**__ (<@000000000000000000>)  (\`>= 11\`):
[__${ul("common.name").toTitle()}__]
  **${ul("roll.critical.failure")}** — \`1d100\` ⟶ \`[29]\` = \`[29] ⩾ 10\``;
	return finalLink(
		template,
		diceletteText,
		"https://discord.com/channels/guildId/channelId/messageId"
	);
}

export async function getTemplateValues(
	client: EClient,
	ul: Translation,
	interaction: Djs.ChatInputCommandInteraction,
	guildOverride = false
) {
	const s = ul("common.space");
	let template: TemplateResult | undefined;
	if (!guildOverride)
		template = client.userSettings.get(
			interaction.guildId!,
			interaction.user.id
		)?.createLinkTemplate;
	else template = client.settings.get(interaction.guildId!, "createLinkTemplate");
	if (template) template = merge(DEFAULT_TEMPLATE, template);
	else template = DEFAULT_TEMPLATE;

	const preview = getTemplatePreview(ul, template);
	const content = dedent(`
	- __${ul("userSettings.createLink.final.name").toTitle()}__${s}: \`${template!.final}\`
	- __${ul("userSettings.createLink.result.name").toTitle()}__${s}: \`\`${template!.results} \`\`
	- __${ul("userSettings.createLink.joinResult.name").replaceAll("_", " ").toTitle()}__${s}: \`${template!.joinResult}\`
	- __${ul("common.dice").toTitle()}__${s}: \`${template!.format.dice}\`
	- __${ul("userSettings.createLink.info.name").toTitle()}__${s}: \`${template!.format.info}\`
	- __${ul("common.name").toTitle()}__${s}: \`${template!.format.name}\`
	- __${ul("userSettings.createLink.originalDice.name").replaceAll("_", " ").toTitle()}__${s}: \`${template!.format.originalDice}\`
	- __${ul("common.character").toTitle()}__${s}: \`${template!.format.character}\`

	**__${ul("userSettings.createLink.display.name").toTitle()}__**${s}: \`\`${preview}\`\`
	`);
	await interaction.reply({
		content,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

export function createLinksCmdOptions(builder: Djs.SlashCommandSubcommandGroupBuilder) {
	return builder
		.setDescriptions("userSettings.createLink.description")
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("userSettings.createLink.format.name")
				.setDescriptions("userSettings.createLink.description")
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.final.name")
						.setDescriptions("userSettings.createLink.final.description")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.result.name")
						.setDescriptions("userSettings.createLink.result.description")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("common.dice")
						.setDescriptions("userSettings.createLink.dice")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.info.name")
						.setDescriptions("userSettings.createLink.info.description")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("common.name")
						.setDescriptions("userSettings.createLink.name")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.joinResult.name")
						.setDescriptions("userSettings.createLink.joinResult.description")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.originalDice.name")
						.setDescriptions("userSettings.createLink.originalDice.description")
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setNames("common.character")
						.setDescriptions("userSettings.createLink.character")
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("userSettings.createLink.reset.name")
				.setDescriptions("userSettings.createLink.reset.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("userSettings.createLink.display.name")
				.setDescriptions("userSettings.createLink.display.description")
		);
}
