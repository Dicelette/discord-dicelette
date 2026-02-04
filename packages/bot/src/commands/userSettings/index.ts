import {
	getInteractionContext as getLangAndConfig,
	getSettingsAutoComplete,
	removeEntry,
} from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import * as Djs from "discord.js";
import * as attributes from "./attributes";
import {
	createLinksCmdOptions,
	getTemplateValues,
	resetTemplate,
	setTemplate,
} from "./setTemplate";
import * as snippets from "./snippets";

async function autoComplete(
	interaction: Djs.AutocompleteInteraction,
	client: EClient,
	type: "attributes" | "snippets" = "snippets"
) {
	const choices = getSettingsAutoComplete(interaction, client, type);
	await interaction.respond(choices);
}

export const userSettings = {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const group = interaction.options.getSubcommandGroup(true);
		const subcommand = interaction.options.getSubcommand(true);
		const validGroup = [t("common.snippets"), t("userSettings.attributes.title")];
		if (subcommand === t("common.delete") && validGroup.includes(group)) {
			const type =
				group === t("userSettings.attributes.title") ? "attributes" : "snippets";
			await autoComplete(interaction, client, type);
		}
	},
	data: new Djs.SlashCommandBuilder()
		.setNames("userSettings.name")
		.setDescriptions("userSettings.description")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.addSubcommandGroup((group) =>
			createLinksCmdOptions(
				group
					.setNames("userSettings.createLink.title")
					.setDescriptions("userSettings.createLink.description")
			)
		)
		.addSubcommandGroup((group) =>
			group
				.setNames("common.snippets")
				.setDescriptions("userSettings.snippets.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.create.title")
						.setDescriptions("userSettings.snippets.create.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.snippets.create.name")
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setNames("common.dice")
								.setDescriptions("userSettings.snippets.create.content.description")
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("common.delete")
						.setDescriptions("userSettings.snippets.delete.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.snippets.delete.name")
								.setRequired(true)
								.setAutocomplete(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.list.title")
						.setDescriptions("userSettings.snippets.list.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("export.name")
						.setDescriptions("userSettings.snippets.export.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("import.name")
						.setDescriptions("userSettings.snippets.import.description")
						.addAttachmentOption((option) =>
							option
								.setNames("userSettings.snippets.import.file.title")
								.setDescriptions("userSettings.snippets.import.file.description")
								.setRequired(true)
						)
						.addBooleanOption((option) =>
							option
								.setNames("userSettings.snippets.import.overwrite.title")
								.setDescriptions("userSettings.snippets.import.overwrite.description")
						)
				)
		)
		.addSubcommandGroup((group) =>
			group
				.setNames("userSettings.attributes.title")
				.setDescriptions("userSettings.attributes.description")
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.create.title")
						.setDescriptions("userSettings.attributes.create.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.attributes.create.name")
								.setRequired(true)
						)
						.addNumberOption((option) =>
							option
								.setNames("userSettings.attributes.create.value.title")
								.setDescriptions("userSettings.attributes.create.value.description")
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("common.delete")
						.setDescriptions("userSettings.attributes.delete.description")
						.addStringOption((option) =>
							option
								.setNames("common.name")
								.setDescriptions("userSettings.attributes.delete.name")
								.setRequired(true)
								.setAutocomplete(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("userSettings.snippets.list.title")
						.setDescriptions("userSettings.attributes.list.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("export.name")
						.setDescriptions("userSettings.attributes.export.description")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setNames("import.name")
						.setDescriptions("userSettings.attributes.import.description")
						.addAttachmentOption((option) =>
							option
								.setNames("userSettings.snippets.import.file.title")
								.setDescriptions("userSettings.snippets.import.file.description")
								.setRequired(true)
						)
						.addBooleanOption((option) =>
							option
								.setNames("userSettings.snippets.import.overwrite.title")
								.setDescriptions("userSettings.snippets.import.overwrite.description")
						)
				)
		),
	execute: async (interaction: Djs.ChatInputCommandInteraction, client: EClient) => {
		const group = interaction.options.getSubcommandGroup(true);
		const subcommand = interaction.options.getSubcommand(true);
		const { ul } = getLangAndConfig(client, interaction);
		if (group === t("userSettings.createLink.title")) {
			if (subcommand === t("userSettings.createLink.format.name"))
				return await setTemplate(client, interaction);
			if (subcommand === t("userSettings.createLink.display.name"))
				return await getTemplateValues(client, ul, interaction);
			if (subcommand === t("userSettings.createLink.reset.name"))
				return resetTemplate(client, interaction);
		} else if (group === t("common.snippets")) {
			if (subcommand === t("userSettings.snippets.create.title"))
				return await snippets.register(client, interaction);
			if (subcommand === t("common.delete"))
				return await removeEntry(client, interaction, "snippets", ul);
			if (subcommand === t("userSettings.snippets.list.title"))
				return await snippets.displayList(client, interaction);
			if (subcommand === t("export.name"))
				return await snippets.exportSnippets(client, interaction);
			if (subcommand === t("import.name"))
				return await snippets.importSnippets(client, interaction);
		} else if (group === t("userSettings.attributes.title")) {
			switch (subcommand) {
				case t("userSettings.snippets.create.title"):
					return await attributes.register(client, interaction);
				case t("common.delete"):
					return await removeEntry(client, interaction, "attributes", ul);
				case t("userSettings.snippets.list.title"):
					return await attributes.display(client, interaction);
				case t("export.name"):
					return await attributes.exportStats(client, interaction);
				case t("import.name"):
					return await attributes.importattributes(client, interaction);
			}
		}
	},
};

export { setTemplate, getTemplateValues, createLinksCmdOptions };
