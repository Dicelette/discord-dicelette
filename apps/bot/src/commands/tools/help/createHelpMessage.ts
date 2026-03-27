import { ln, t } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import dedent from "dedent";
import * as Djs from "discord.js";
import { getConfigIds, getHelpDBCmd } from "./commandId";

export function createHelpMessageDB(
	guildID: Djs.Snowflake,
	ul: Translation,
	db: Settings,
	commandsID?: Djs.Collection<string, Djs.ApplicationCommand<unknown>>
) {
	if (!db.has(guildID, "templateID") || !commandsID) return "";
	const ids = getHelpDBCmd(commandsID);
	return ul("help.messageDB", {
		calc: ids?.[t("calc.title")],
		dbroll: ids?.[t("dbRoll.name")],
		display: ids?.[t("display.title")],
		graph: ids?.[t("graph.name")],
		macro: ids?.[t("common.macro")],
	});
}

export async function helpAtInvit(guild: Djs.Guild): Promise<void> {
	const cmdsId = guild.commands.cache;
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

	const ids = getConfigIds(cmdsId);
	const commandId = {
		delete: ids?.[t("timer.name")],
		lang: ids?.[t("config.lang.name")],
		result: ids?.[t("changeThread.name")],
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
