import type { EClient } from "@dicelette/bot-core";
import { ln, t } from "@dicelette/localization";
import type * as Djs from "discord.js";
import { reply } from "messages";
import { findLocale } from "./utils";

export function changeLanguage(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	interaction: Djs.CommandInteraction
) {
	const lang = options.getString(t("config.lang.options.name"), true) as Djs.Locale;
	client.settings.set(interaction.guild!.id, lang, "lang");
	const ul = ln(lang);
	const nameOfLang = findLocale(lang);
	//update memory
	client.guildLocale.set(interaction.guild!.id, lang);
	return reply(interaction, {
		content: ul("config.lang.set", { lang: nameOfLang }),
	});
}
