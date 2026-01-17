/** biome-ignore-all lint/style/useNamingConvention: Discord didn't use camelCase for command name */

import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import { LINKS, type Translation } from "@dicelette/types";
import {
	getAllVersions,
	getChangelogSince,
	getOptionsVersion,
	normalizeChangelogFormat,
	splitChangelogByVersion,
} from "@dicelette/utils";
import dedent from "dedent";
import * as Djs from "discord.js";
import { reply } from "messages";

import { VERSION } from "../../../../index";
import "discord_ext";
import { getConfigIds, getHelpDBCmd, getIDForAdminDB } from "./commandId";
import { createHelpMessageDB } from "./createHelpMessage";

export const help = {
	async autocomplete(interaction: Djs.AutocompleteInteraction): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		if (subcommand !== t("help.changelog.name")) return;
		const focused = options.getFocused(true);
		if (focused.name !== t("help.changelog.version.name")) return;
		const versions = getOptionsVersion();
		const filteredVersions = versions.filter((v) =>
			v.name.toLowerCase().includes(focused.value.toLowerCase())
		);
		await interaction.respond(
			filteredVersions.slice(0, 25).map((v) => ({ name: v.name, value: v.value }))
		);
	},
	data: new Djs.SlashCommandBuilder()
		.setNames("help.name")
		.setContexts(Djs.InteractionContextType.Guild)
		.setDescriptions("help.description")
		.addSubcommand((sub) =>
			sub.setNames("help.info.name").setDescriptions("help.info.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.bug.name").setDescriptions("help.bug.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.fr.name").setDescriptions("help.fr.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("help.admin.name").setDescriptions("help.admin.description")
		)
		.addSubcommand((sub) =>
			sub.setNames("register.name").setDescriptions("help.register.description")
		)
		.addSubcommand((sub) =>
			sub
				.setNames("help.changelog.name")
				.setDescriptions("help.changelog.description")
				.addStringOption((sub) =>
					sub
						.setNames("help.changelog.version.name")
						.setDescriptions("help.changelog.version.description")
						.setRequired(false)
						.setAutocomplete(true)
				)
		),

	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const { ul, langToUse } = getLangAndConfig(client, interaction);
		const link = langToUse === "fr" ? LINKS.fr : LINKS.en;
		const commandsID = await interaction.guild?.commands.fetch();
		if (!commandsID) return;
		const getInfo = new GetInfo(interaction, client, ul, link);
		switch (subcommand) {
			case t("help.info.name"): {
				await getInfo.getInfo();
				break;
			}
			case t("help.bug.name"):
				await getInfo.getBugReportLink();
				break;
			case t("help.fr.name"):
				await getInfo.getRequestLink();
				break;
			case t("register.name"): {
				await getInfo.getRegister();
				break;
			}
			case t("help.admin.name"): {
				await getInfo.getAdminDBIDs();
				break;
			}
			case t("help.changelog.name"): {
				await getInfo.getChangelog();
				break;
			}
		}
	},
};

class GetInfo {
	constructor(
		private readonly interaction: Djs.ChatInputCommandInteraction,
		private client: EClient,
		private readonly ul: Translation,
		private link: typeof LINKS.fr | typeof LINKS.en
	) {
		this.interaction = interaction;
		this.client = client;
		this.ul = ul;
		this.link = link;
	}

	private async getCommandsID() {
		const commandsID = await this.interaction.guild?.commands.fetch();
		if (!commandsID) throw new Error("No commands found");
		return commandsID;
	}

	async getChangelog() {
		await this.interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const options = this.interaction.options as Djs.CommandInteractionOptionResolver;
		let version = options.getString(t("help.changelog.version.name"), false);
		const allVersion = getAllVersions();
		if (!version) version = allVersion[0];
		const changelog = getChangelogSince(version, true);
		const splittedChangelog = splitChangelogByVersion(changelog);
		if (!changelog) {
			await reply(this.interaction, {
				content: this.ul("help.changelog.noChanges", { version }),
			});
			return;
		}
		const firstMessage = new Djs.TextDisplayBuilder().setContent(
			normalizeChangelogFormat(splittedChangelog[0])
		);
		if (splittedChangelog.length === 1) {
			await this.interaction.editReply({
				components: [firstMessage],
				flags: Djs.MessageFlags.IsComponentsV2,
			});
			return;
		}
		//edit reply with the first part of the changelog
		await this.interaction.editReply({
			components: [firstMessage],
			flags: Djs.MessageFlags.IsComponentsV2,
		});
		for (const split of splittedChangelog.slice(1)) {
			const msg = new Djs.TextDisplayBuilder().setContent(
				normalizeChangelogFormat(split)
			);
			await this.interaction.followUp({
				components: [msg],
				flags: [Djs.MessageFlags.IsComponentsV2, Djs.MessageFlags.Ephemeral],
			});
		}
	}

	async getAdminDBIDs() {
		const commandsID = await this.getCommandsID();
		const idsAdmin = getConfigIds(commandsID);
		const replySection = [];

		replySection.push(
			new Djs.TextDisplayBuilder().setContent(
				dedent(
					this.ul("help.admin.messageNoDB", {
						delete: idsAdmin?.[t("timer.name")],
						disable: idsAdmin?.[t("disableThread.name")],
						display: idsAdmin?.[t("display.title")],
						language: idsAdmin?.[t("config.lang.options.name")],
						logs: idsAdmin?.[t("logs.name")],
						result: idsAdmin?.[t("changeThread.name")],
						self_register: idsAdmin?.[t("config.selfRegister.name")],
						timestamp: idsAdmin?.[t("timestamp.name")],
					})
				)
			)
		);
		const idsAdminDB = getIDForAdminDB(
			commandsID,
			this.client.settings,
			this.interaction.guild!.id
		);
		if (!idsAdminDB) return;
		replySection.push(
			new Djs.TextDisplayBuilder().setContent(
				dedent(
					this.ul("help.admin.messageDB", {
						calc: idsAdminDB?.[t("calc.title")],
						dbroll: idsAdminDB?.[t("dbRoll.name")],
						delete_char: idsAdminDB?.[t("deleteChar.name")],
						dice: idsAdminDB?.["auto_role dice"],
						gm: {
							calc: idsAdminDB?.["gm calc"],
							dbRoll: idsAdminDB?.["gm dbroll"],
							macro: idsAdminDB?.["gm macro"],
						},
						macro: idsAdminDB?.[t("common.macro")],
						stat: idsAdminDB?.["auto_role statistics"],
					})
				)
			)
		);
		await this.interaction.reply({
			components: replySection,
			flags: [Djs.MessageFlags.IsComponentsV2, Djs.MessageFlags.Ephemeral],
		});
	}

	async getInfo() {
		const commandsID = await this.getCommandsID();
		const rollID = commandsID.findKey((command) => command.name === "roll");
		const sceneID = commandsID.findKey((command) => command.name === "scene");
		const mathId = commandsID.findKey((command) => command.name === "math");
		const msg = this.ul("help.message", {
			mathId,
			rollId: rollID,
			sceneId: sceneID,
			version: VERSION,
		});
		const dbCMD = createHelpMessageDB(
			this.interaction.guild!.id,
			this.ul,
			this.client.settings,
			commandsID
		);
		const replySection = [];

		replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(msg)));

		if (dbCMD) replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(dbCMD)));

		const end = dedent(this.ul("help.diceNotation"));

		await this.interaction.reply({
			components: replySection,
			flags: [Djs.MessageFlags.IsComponentsV2, Djs.MessageFlags.Ephemeral],
		});
		await this.interaction.followUp({
			content: end,
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	async getBugReportLink() {
		await reply(this.interaction, {
			content: dedent(this.ul("help.bug.message", { link: this.link.bug })),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	async getRequestLink() {
		await reply(this.interaction, {
			content: dedent(this.ul("help.fr.message", { link: this.link.fr })),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	async getRegister() {
		const commandsID = await this.getCommandsID();
		const helpDBCmd = getHelpDBCmd(commandsID);
		await reply(this.interaction, {
			content: dedent(
				this.ul("help.register.message", {
					calc: helpDBCmd?.[t("calc.title")],
					dbroll: helpDBCmd?.[t("dbRoll.name")],
					display: helpDBCmd?.[t("display.title")],
					graph: helpDBCmd?.[t("graph.name")],
					macro: helpDBCmd?.[t("common.macro")],
					register: helpDBCmd?.[t("register.name")],
				})
			),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
}
