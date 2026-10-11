/** biome-ignore-all lint/style/useNamingConvention: Discord didn't use camelCase for command name */

import { t } from "@dicelette/localization";
import type { LINKS, Translation } from "@dicelette/types";
import {
	getAllVersions,
	getChangelogSince,
	normalizeChangelogFormat,
	splitChangelogByVersion,
} from "@dicelette/utils";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { VERSION } from "../../../../version";
import {
	fetchAllCommands,
	getConfigIds,
	getHelpDBCmd,
	getIDForAdminDB,
} from "./commandId";
import { createHelpMessageDB } from "./createHelpMessage";
import "@dicelette/discord_ext";

export class GetInfo {
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
		if (!this.interaction.guild)
			return new Djs.Collection<string, Djs.ApplicationCommand>();
		return fetchAllCommands(this.interaction.guild);
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
			await this.interaction.botReply({
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
						delete: idsAdmin?.[t("timer.name")] || 0,
						display: idsAdmin?.[t("display.title")] || 0,
						language: idsAdmin?.[t("config.lang.options.name")] || 0,
						logs: idsAdmin?.[t("logs.name")] || 0,
						result: idsAdmin?.[t("changeThread.name")] || 0,
						self_register: idsAdmin?.[t("config.selfRegister.name")] || 0,
						timestamp: idsAdmin?.[t("timestamp.name")] || 0,
					})
				)
			)
		);
		const idsAdminDB = getIDForAdminDB(
			commandsID,
			this.client.settings,
			this.interaction.guild?.id
		);
		if (idsAdminDB)
			replySection.push(
				new Djs.TextDisplayBuilder().setContent(
					dedent(
						this.ul("help.admin.messageDB", {
							calc: idsAdminDB[t("calc.title")],
							dbroll: idsAdminDB[t("dbRoll.name")],
							delete_char: idsAdminDB[t("deleteChar.name")],
							dice: idsAdminDB["auto_role dice"],
							gm: {
								calc: idsAdminDB["gm calc"],
								dbRoll: idsAdminDB["gm dbroll"],
								macro: idsAdminDB["gm macro"],
							},
							macro: idsAdminDB[t("common.macro")],
							stat: idsAdminDB["auto_role statistics"],
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
		const sceneID = commandsID.findKey((command) => command.name === "scene") || 0;
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
		await this.interaction.botReply({
			content: dedent(this.ul("help.bug.message", { link: this.link.bug })),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	async getRequestLink() {
		await this.interaction.botReply({
			content: dedent(this.ul("help.fr.message", { link: this.link.fr })),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	async getRegister() {
		const commandsID = await this.getCommandsID();
		const helpDBCmd = getHelpDBCmd(commandsID);
		await this.interaction.botReply({
			content: dedent(
				this.ul("help.register.message", {
					calc: helpDBCmd?.[t("calc.title")] || 0,
					dbroll: helpDBCmd?.[t("dbRoll.name")] || 0,
					display: helpDBCmd?.[t("display.title")] || 0,
					graph: helpDBCmd?.[t("graph.name")] || 0,
					macro: helpDBCmd?.[t("common.macro")] || 0,
					register: helpDBCmd?.[t("register.name")] || 0,
				})
			),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}
}
