import { ln, t } from "@dicelette/localization";
import { LINKS, type Settings, type Translation } from "@dicelette/types";
import {
	getAllVersions,
	getChangelogSince,
	getOptionsVersion,
	logger,
	normalizeChangelogFormat,
	splitChangelogByVersion,
} from "@dicelette/utils";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { reply } from "messages";
import { getLangAndConfig } from "utils";
import { VERSION } from "../../../index";
import "discord_ext";

export const help = {
	data: new Djs.SlashCommandBuilder()
		.setNames("help.name")
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
		switch (subcommand) {
			case t("help.info.name"): {
				const rollID = commandsID.findKey((command) => command.name === "roll");
				const sceneID = commandsID.findKey((command) => command.name === "scene");
				const mathId = commandsID.findKey((command) => command.name === "math");
				const msg = ul("help.message", {
					rollId: rollID,
					sceneId: sceneID,
					mathId,
					version: VERSION,
				});
				const dbCMD = createHelpMessageDB(
					interaction.guild!.id,
					ul,
					client.settings,
					commandsID
				);
				const replySection = [];

				replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(msg)));

				if (dbCMD)
					replySection.push(new Djs.TextDisplayBuilder().setContent(dedent(dbCMD)));

				const end = dedent(ul("help.diceNotation"));

				await interaction.reply({
					flags: Djs.MessageFlags.IsComponentsV2,
					components: replySection,
				});
				await interaction.followUp({
					content: end,
				});

				break;
			}
			case t("help.bug.name"):
				await reply(interaction, {
					content: dedent(ul("help.bug.message", { link: link.bug })),
				});
				break;
			case t("help.fr.name"):
				await reply(interaction, {
					content: dedent(ul("help.fr.message", { link: link.fr })),
				});
				break;
			case t("register.name"): {
				const helpDBCmd = getHelpDBCmd(commandsID);
				await reply(interaction, {
					content: dedent(
						ul("help.register.message", {
							macro: helpDBCmd?.[t("common.macro")],
							dbroll: helpDBCmd?.[t("dbRoll.name")],
							graph: helpDBCmd?.[t("graph.name")],
							display: helpDBCmd?.[t("display.title")],
							calc: helpDBCmd?.[t("calc.title")],
							register: helpDBCmd?.[t("register.name")],
						})
					),
				});
				break;
			}
			case t("help.admin.name"): {
				const idsAdmin = getConfigIds(commandsID);
				const replySection = [];

				replySection.push(
					new Djs.TextDisplayBuilder().setContent(
						dedent(
							ul("help.admin.messageNoDB", {
								logs: idsAdmin?.[t("logs.name")],
								disable: idsAdmin?.[t("disableThread.name")],
								result: idsAdmin?.[t("changeThread.name")],
								delete: idsAdmin?.[t("timer.name")],
								display: idsAdmin?.[t("display.title")],
								timestamp: idsAdmin?.[t("timestamp.name")],
								self_register: idsAdmin?.[t("config.selfRegister.name")],
								language: idsAdmin?.[t("config.lang.options.name")],
							})
						)
					)
				);
				const idsAdminDB = getIDForAdminDB(
					commandsID,
					client.settings,
					interaction.guild!.id
				);
				if (!idsAdminDB) return;
				replySection.push(
					new Djs.TextDisplayBuilder().setContent(
						dedent(
							ul("help.admin.messageDB", {
								delete_char: idsAdminDB?.[t("deleteChar.name")],
								stat: idsAdminDB?.["auto_role statistics"],
								dice: idsAdminDB?.["auto_role dice"],
								gm: {
									macro: idsAdminDB?.["gm macro"],
									dbRoll: idsAdminDB?.["gm dbroll"],
									calc: idsAdminDB?.["gm calc"],
								},
								dbroll: idsAdminDB?.[t("dbRoll.name")],
								macro: idsAdminDB?.[t("common.macro")],
								calc: idsAdminDB?.[t("calc.title")],
							})
						)
					)
				);
				await interaction.reply({
					components: replySection,
					flags: Djs.MessageFlags.IsComponentsV2,
				});
				break;
			}
			case t("help.changelog.name"): {
				await interaction.deferReply();
				const options = interaction.options as Djs.CommandInteractionOptionResolver;
				let version = options.getString(t("help.changelog.version.name"), false);
				const allVersion = getAllVersions();
				if (!version) version = allVersion[0];
				const changelog = getChangelogSince(version, true);
				const splittedChangelog = splitChangelogByVersion(changelog);
				if (!changelog) {
					await reply(interaction, {
						content: ul("help.changelog.noChanges", { version }),
					});
					return;
				}
				const firstMessage = new Djs.TextDisplayBuilder().setContent(
					normalizeChangelogFormat(splittedChangelog[0])
				);
				if (splittedChangelog.length === 1) {
					await interaction.editReply({
						components: [firstMessage],
						flags: Djs.MessageFlags.IsComponentsV2,
					});
					return;
				}
				//edit reply with the first part of the changelog
				await interaction.editReply({
					flags: Djs.MessageFlags.IsComponentsV2,
					components: [firstMessage],
				});
				for (const split of splittedChangelog.slice(1)) {
					const msg = new Djs.TextDisplayBuilder().setContent(
						normalizeChangelogFormat(split)
					);
					await interaction.followUp({
						components: [msg],
						flags: Djs.MessageFlags.IsComponentsV2,
					});
				}
				break;
			}
		}
	},
};

function getCommandIds(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>,
	commandNames: string[]
) {
	const ids: Record<string, string | undefined> = {};
	for (const cmd of commandNames) {
		ids[cmd] = commandsID.findKey((command) => command.name === cmd);
	}
	return ids;
}

function getHelpDBCmd(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>
) {
	const commandToFind = [
		t("common.macro"),
		t("dbRoll.name"),
		t("graph.name"),
		t("display.title"),
		t("calc.title"),
		t("register.name"),
	];
	return getCommandIds(commandsID, commandToFind);
}

function getConfigIds(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>
) {
	const ids: Record<string, string | undefined> = {};
	const idConfig = commandsID.findKey((command) => command.name === t("config.name"));
	if (!idConfig) return;

	ids[t("logs.name")] = idConfig;
	ids[t("changeThread.name")] = idConfig;
	ids[t("timer.name")] = idConfig;
	ids[t("display.title")] = idConfig;
	ids[t("timestamp.name")] = idConfig;
	ids[t("config.lang.name")] = idConfig;
	ids[t("config.selfRegister.name")] = idConfig;
	ids[t("config.lang.options.name")] = idConfig;

	// Recherche des subcommandes qui commencent par /config
	commandsID.forEach((command) => {
		if (command.name.startsWith("config")) {
			ids[command.name] = command.id;
		}
	});

	return ids;
}

function getIDForAdminDB(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>,
	db: Settings,
	guildID: Djs.Snowflake
) {
	if (!db.has(guildID, "templateID")) return;
	const commandToFind = [
		t("deleteChar.name"),
		t("config.name"),
		t("mjRoll.name"),
		t("dbRoll.name"),
		t("common.macro"),
		t("calc.title"),
	];
	const ids = getCommandIds(commandsID, commandToFind);

	if (ids[t("mjRoll.name")]) {
		ids["gm macro"] = ids[t("mjRoll.name")];
		ids["gm dbroll"] = ids[t("mjRoll.name")];
		ids["gm calc"] = ids[t("mjRoll.name")];
	}

	if (ids[t("config.name")]) {
		ids["auto_role statistics"] = ids[t("config.name")];
		ids["auto_role dice"] = ids[t("config.name")];
	}

	return ids;
}

function createHelpMessageDB(
	guildID: Djs.Snowflake,
	ul: Translation,
	db: Settings,
	commandsID?: Djs.Collection<string, Djs.ApplicationCommand<unknown>>
) {
	if (!db.has(guildID, "templateID") || !commandsID) return "";
	const ids = getHelpDBCmd(commandsID);
	return ul("help.messageDB", {
		macro: ids?.[t("common.macro")],
		dbroll: ids?.[t("dbRoll.name")],
		graph: ids?.[t("graph.name")],
		display: ids?.[t("display.title")],
		calc: ids?.[t("calc.title")],
	});
}

export async function helpAtInvit(guild: Djs.Guild) {
	const commandsId = await guild.commands.fetch();
	const lang = guild.preferredLocale;
	const ul = ln(lang);
	const docLinkExt = lang === "fr" ? "" : "en/";
	const docLink = `https://dicelette.github.io/${docLinkExt}`;
	//get system channel
	let systemChannel = guild.systemChannel ?? "dm";
	if (
		systemChannel instanceof Djs.TextChannel &&
		(!systemChannel.isTextBased() ||
			!systemChannel.viewable ||
			!systemChannel.permissionsFor(guild.members.me!).has("SendMessages"))
	)
		systemChannel = "dm";

	const ids = getConfigIds(commandsId);
	const commandId = {
		lang: ids?.[t("config.lang.name")],
		result: ids?.[t("changeThread.name")],
		delete: ids?.[t("timer.name")],
	};
	if (!ids) return;
	const msg = dedent(`
	${ul("help.invit.serv", { serv: guild.name })}
	
	${ul("help.invit.change_language", { id: commandId, lang })}
	
	${ul("help.invit.copy", { id: commandId })}
	- ${ul("help.invit.disable", { id: commandId })}
	- ${ul("help.invit.channel", { id: commandId })}
	
	${ul("help.invit.timer", { id: commandId })}
	${ul("help.invit.default")}
	
	${ul("help.invit.link", { docLink })}`);
	const owner = await guild.fetchOwner();
	if (systemChannel === "dm") {
		await owner.send(msg);
	} else if (systemChannel instanceof Djs.TextChannel) {
		try {
			await systemChannel.send(msg);
		} catch (_e) {
			await owner.send(msg);
			logger.warn(_e);
		}
	}
}
