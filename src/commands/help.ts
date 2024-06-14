/* eslint-disable no-case-declarations */
import { LINKS, type Settings, type Translation } from "@interface";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { reply } from "@utils";
import { type ApplicationCommand, type Collection, type CommandInteraction, type CommandInteractionOptionResolver, type Locale,SlashCommandBuilder, type Snowflake } from "discord.js";
import i18next from "i18next";
import {dedent} from "ts-dedent";

const t = i18next.getFixedT("en");

export const help = {
	data: new SlashCommandBuilder()
		.setName(t("help.name"))
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(t("help.description"))
		.setDescriptionLocalizations(cmdLn("help.description"))
		.addSubcommand(sub =>
			sub
				.setName(t("help.info.name"))
				.setNameLocalizations(cmdLn("help.info.name"))
				.setDescription(t("help.info.description"))
				.setDescriptionLocalizations(cmdLn("help.info.description"))
		)
		.addSubcommand(sub => 
			sub
				.setName(t("help.bug.name"))
				.setNameLocalizations(cmdLn("help.bug.name"))
				.setDescription(t("help.bug.description"))
				.setDescriptionLocalizations(cmdLn("help.bug.description"))
		)
		.addSubcommand(sub =>
			sub
				.setName(t("help.fr.name"))
				.setNameLocalizations(cmdLn("help.fr.name"))
				.setDescription(t("help.fr.description"))
				.setDescriptionLocalizations(cmdLn("help.fr.description"))		
		)
		.addSubcommand(sub =>
			sub
				.setName(t("help.admin.name"))
				.setNameLocalizations(cmdLn("help.admin.name"))
				.setDescription(t("help.admin.description"))
				.setDescriptionLocalizations(cmdLn("help.admin.description"))
		)
		.addSubcommand(sub =>
			sub
				.setName(t("help.register.name"))
				.setNameLocalizations(cmdLn("help.register.name"))
				.setDescription(t("help.register.description"))
				.setDescriptionLocalizations(cmdLn("help.register.description"))
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const ul = ln(interaction.locale as Locale);
		const link = interaction.locale === "fr" ? LINKS.fr : LINKS.en;
		const commandsID = await interaction.guild?.commands.fetch();
		if (!commandsID) return;

		switch (subcommand) {
		case (t("help.info.name")):
			const rollID = commandsID.findKey(command => command.name === "roll");
			const sceneID = commandsID.findKey(command => command.name === "scene");
			const msg = ul("help.message", {rollId: rollID, sceneId: sceneID, dbCMD: createHelpMessageDB(interaction.guild!.id, ul, client.settings, commandsID)});
			await reply(interaction,{ content: dedent(msg)});
			await interaction.followUp({ content: dedent(ul("help.diceNotation"))});
			break;
		case (t("help.bug.name")):
			await reply(interaction, { content: dedent(ul("help.bug.message", {link: link.bug}))});
			break;
		case (t("help.fr.name")):
			await reply(interaction, { content: dedent(ul("help.fr.message", {link: link.fr}))});
			break;
		case (t("help.register.name")):
			const helpDBCmd = getHelpDBCmd(commandsID);
			await reply(interaction, { content: dedent(ul("help.register.message", {
				dbd: helpDBCmd?.[t("rAtq.name")],
				dbroll: helpDBCmd?.[t("dbRoll.name")],
				graph: helpDBCmd?.[t("graph.name")],
				display: helpDBCmd?.[t("display.title")],
			}))});
			break;
		case (t("help.admin.name")):
			const idsAdmin = getIDForAdminNoDB(commandsID);
			await reply(interaction, { content: dedent(ul("help.admin.messageNoDB", {
				logs: idsAdmin?.[t("logs.name")],
				disable: idsAdmin?.[t("disableThread.name")],
				result: idsAdmin?.[t("changeThread.name")],
				delete: idsAdmin?.[t("timer.name")],
				display: idsAdmin?.[t("config.display.name")],
				timestamp: idsAdmin?.[t("timestamp.name")],
			}))});
			const idsAdminDB = getIDForAdminDB(commandsID, client.settings, interaction.guild!.id);
			if (!idsAdminDB) return;
			await interaction.followUp({ content: dedent(ul("help.admin.messageDB", {
				deleteChar: idsAdminDB?.[t("deleteChar.name")],
				stat: idsAdminDB?.["auto_role statistic"],
				dice: idsAdminDB?.["auto_role dice"],
				gm_dbd: idsAdminDB?.["gm dbd"],
				gm_dbroll: idsAdminDB?.["gm dbroll"],
				dbroll: idsAdminDB?.[t("dbRoll.name")],
				dbd: idsAdminDB?.[t("rAtq.name")],
			}))});
			break;	
		}
	}
};

function getHelpDBCmd(
	commandsID: Collection<string, ApplicationCommand<unknown>>,
) {
	const commandToFind = [
		t("rAtq.name"),
		t("dbRoll.name"),
		t("graph.name"),
		t("display.title"),
	];
	const ids: {[key: string]: string | undefined} = {};
	for (const cmd of commandToFind) {
		ids[cmd] = commandsID.findKey(command => command.name === cmd);
	}
	return ids;
}

function createHelpMessageDB(
	guildID: Snowflake, 
	ul: Translation, 
	db: Settings,
	commandsID?: Collection<string, ApplicationCommand<unknown>>
) {
	if (!db.has(guildID, "templateID") || !commandsID) return "";
	const ids = getHelpDBCmd(commandsID);
	return ul("help.messageDB", {
		dbd: ids?.[t("rAtq.name")],
		dbroll: ids?.[t("dbRoll.name")],
		graph: ids?.[t("graph.name")],
		display: ids?.[t("display.title")],
	});
}

function getIDForAdminNoDB(commandsID: Collection<string, ApplicationCommand<unknown>>) {
	const ids: {[key: string]: string | undefined} = {};
	const idConfig = commandsID.findKey(command => command.name === t("config.name"));
	if (!idConfig) {
		return;
	}
	ids[t("logs.name")] = idConfig;
	ids[t("changeThread.name")] = idConfig;
	ids[t("timer.name")] = idConfig;
	ids[t("disableThread.name")] = idConfig;
	ids[t("config.display.name")] = idConfig;
	ids[t("timestamp.name")] = idConfig;
	return ids;
}

function getIDForAdminDB(commandsID: Collection<string, ApplicationCommand<unknown>>, db: Settings, guildID: Snowflake) {
	if (!db.has(guildID, "templateID")) return;
	const commandToFind = [
		t("deleteChar.name"),
		t("config.name"),
		t("mjRoll.name"),
		t("dbRoll.name"),
		t("rAtq.name")
	];
	const ids: {[key: string]: string | undefined} = {};
	for (const cmd of commandToFind) {
		if (cmd === t("mjRoll.name")) {
			const id = commandsID.findKey(command => command.name === cmd);
			if (id) {
				ids["gm dbd"] = id;
				ids["gm dbroll"] = id;
			}
		} else if (cmd === t("config.name")) {
			const id = commandsID.findKey(command => command.name === cmd);
			if (id) {
				ids["auto_role statistic"] = id;
				ids["auto_role dice"] = id;
			}
		} else {
			ids[cmd] = commandsID.findKey(command => command.name === cmd);
		}
	}
	return ids;
}