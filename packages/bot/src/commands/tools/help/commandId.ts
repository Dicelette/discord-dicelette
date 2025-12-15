import { t } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import type * as Djs from "discord.js";

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

export function getHelpDBCmd(
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

export function getConfigIds(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>
) {
	const ids: Record<string, string | undefined> = {};
	const idConfig = commandsID.findKey((command) => command.name === t("config.name"));
	if (!idConfig) return;

	ids[t("logs.name")] = idConfig;
	ids[t("changeThread.name")] = idConfig;
	ids[t("timer.name")] = idConfig;
	ids[t("display.title")] = idConfig;
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

export function getIDForAdminDB(
	commandsID: Djs.Collection<string, Djs.ApplicationCommand<unknown>>,
	db: Settings,
	guildID: Djs.Snowflake
) {
	if (!db.has(guildID, "templateID.channelId")) return;
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
