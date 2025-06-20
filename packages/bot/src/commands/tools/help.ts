import { cmdLn, ln, t } from "@dicelette/localization";
import { LINKS, type Settings, type Translation } from "@dicelette/types";
import type { EClient } from "client";
import dedent from "dedent";
import * as Djs from "discord.js";
import { reply } from "messages";
import { getLangAndConfig } from "../../utils";
import { logger } from "@dicelette/utils";
export const help = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("help.name"))
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(t("help.description"))
		.setDescriptionLocalizations(cmdLn("help.description"))
		.addSubcommand((sub) =>
			sub
				.setName(t("help.info.name"))
				.setNameLocalizations(cmdLn("help.info.name"))
				.setDescription(t("help.info.description"))
				.setDescriptionLocalizations(cmdLn("help.info.description"))
		)
		.addSubcommand((sub) =>
			sub
				.setName(t("help.bug.name"))
				.setNameLocalizations(cmdLn("help.bug.name"))
				.setDescription(t("help.bug.description"))
				.setDescriptionLocalizations(cmdLn("help.bug.description"))
		)
		.addSubcommand((sub) =>
			sub
				.setName(t("help.fr.name"))
				.setNameLocalizations(cmdLn("help.fr.name"))
				.setDescription(t("help.fr.description"))
				.setDescriptionLocalizations(cmdLn("help.fr.description"))
		)
		.addSubcommand((sub) =>
			sub
				.setName(t("help.admin.name"))
				.setNameLocalizations(cmdLn("help.admin.name"))
				.setDescription(t("help.admin.description"))
				.setDescriptionLocalizations(cmdLn("help.admin.description"))
		)
		.addSubcommand((sub) =>
			sub
				.setName(t("help.register.name"))
				.setNameLocalizations(cmdLn("help.register.name"))
				.setDescription(t("help.register.description"))
				.setDescriptionLocalizations(cmdLn("help.register.description"))
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
		switch (subcommand) {
			case t("help.info.name"): {
				const rollID = commandsID.findKey((command) => command.name === "roll");
				const sceneID = commandsID.findKey((command) => command.name === "scene");
				const msg = ul("help.message", {
					rollId: rollID,
					sceneId: sceneID,
					dbCMD: createHelpMessageDB(
						interaction.guild!.id,
						ul,
						client.settings,
						commandsID
					),
				});
				await reply(interaction, { content: dedent(msg) });
				await interaction.followUp({
					content: dedent(ul("help.diceNotation")),
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
			case t("help.register.name"): {
				const helpDBCmd = getHelpDBCmd(commandsID);
				await reply(interaction, {
					content: dedent(
						ul("help.register.message", {
							dbd: helpDBCmd?.[t("rAtq.name")],
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
				await reply(interaction, {
					content: dedent(
						ul("help.admin.messageNoDB", {
							logs: idsAdmin?.[t("logs.name")],
							disable: idsAdmin?.[t("disableThread.name")],
							result: idsAdmin?.[t("changeThread.name")],
							delete: idsAdmin?.[t("timer.name")],
							display: idsAdmin?.[t("config.display.name")],
							timestamp: idsAdmin?.[t("timestamp.name")],
							self_register: idsAdmin?.[t("config.selfRegister.name")],
							language: idsAdmin?.[t("config.lang.options.name")],
						})
					),
				});
				const idsAdminDB = getIDForAdminDB(
					commandsID,
					client.settings,
					interaction.guild!.id
				);
				if (!idsAdminDB) return;
				await interaction.followUp({
					content: dedent(
						ul("help.admin.messageDB", {
							delete_char: idsAdminDB?.[t("deleteChar.name")],
							stat: idsAdminDB?.["auto_role statistic"],
							dice: idsAdminDB?.["auto_role dice"],
							gm: {
								dBd: idsAdminDB?.["gm dbd"],
								dbRoll: idsAdminDB?.["gm dbroll"],
								calc: idsAdminDB?.["gm calc"],
							},
							dbroll: idsAdminDB?.[t("dbRoll.name")],
							dbd: idsAdminDB?.[t("rAtq.name")],
							calc: idsAdminDB?.[t("calc.title")],
						})
					),
				});
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
		t("rAtq.name"),
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
	ids[t("config.display.name")] = idConfig;
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
		t("rAtq.name"),
		t("calc.title"),
	];
	const ids = getCommandIds(commandsID, commandToFind);

	if (ids[t("mjRoll.name")]) {
		ids["gm dbd"] = ids[t("mjRoll.name")];
		ids["gm dbroll"] = ids[t("mjRoll.name")];
		ids["gm calc"] = ids[t("mjRoll.name")];
	}

	if (ids[t("config.name")]) {
		ids["auto_role statistic"] = ids[t("config.name")];
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
		dbd: ids?.[t("rAtq.name")],
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
