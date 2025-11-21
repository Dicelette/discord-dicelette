import { t } from "@dicelette/localization";
import {
	DEFAULT_TEMPLATE,
	type TemplateResult,
	type Translation,
} from "@dicelette/types";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { getLangAndConfig } from "utils";
import { finalLink } from "../context_menus";

export async function setTemplate(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	guildOverride = false
) {
	const options = interaction.options;
	const template: TemplateResult = {
		final: options
			.getString(t("userSettings.createLink.final.name"), true)
			.replaceAll("\\s", " "),
		format: {
			dice: options.getString(t("common.dice"), true).replaceAll("\\s", " "),
			info: options
				.getString(t("userSettings.createLink.info.name"), true)
				.replaceAll("\\s", " "),
			name: options.getString(t("common.name"), true).replaceAll("\\s", " "),
		},
		joinResult: options
			.getString(t("userSettings.createLink.joinResult.name"), true)
			.replaceAll("\\s", " "),
		results: options
			.getString(t("userSettings.createLink.result.name"), true)
			.replaceAll("\\s", " "),
	};
	if (!guildOverride) {
		const userKeys = `${interaction.user.id}.createLinkTemplate`;
		client.userSettings.set(interaction.guildId!, template, userKeys);
	} else {
		client.settings.set(interaction.guildId!, template, "createLinkTemplate");
	}
	const { ul } = getLangAndConfig(client, interaction);
	const preview = `\`\`${getTemplatePreview(ul, template)}\`\``;
	await interaction.reply({
		content: ul("userSettings.createLink.success", {
			preview,
		}),
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
	let template: TemplateResult;
	if (!guildOverride)
		template = client.userSettings.get(
			interaction.guildId!,
			interaction.user.id
		)?.createLinkTemplate;
	else template = client.settings.get(interaction.guildId!, "createLinkTemplate");
	if (!template) template = DEFAULT_TEMPLATE;
	const preview = getTemplatePreview(ul, template);
	const content = dedent(`
	- __${ul("userSettings.createLink.final.name").toTitle()}__${s}: \`${template!.final}\`
	- __${ul("userSettings.createLink.result.name").toTitle()}__${s}: \`\`${template!.results} \`\`
	- __${ul("userSettings.createLink.joinResult.name").toTitle()}__${s}: \`${template!.joinResult}\`
	- __${ul("common.dice").toTitle()}__${s}: \`${template!.format.dice}\`
	- __${ul("userSettings.createLink.info.name").toTitle()}__${s}: \`${template!.format.info}\`
	- __${ul("common.statistics").toTitle()}__${s}: \`${template!.format.name}\`

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
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setNames("common.dice")
						.setDescriptions("userSettings.createLink.dice")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.info.name")
						.setDescriptions("userSettings.createLink.info.description")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setNames("common.name")
						.setDescriptions("userSettings.createLink.name")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setNames("userSettings.createLink.joinResult.name")
						.setDescriptions("userSettings.createLink.joinResult.description")
						.setRequired(true)
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
