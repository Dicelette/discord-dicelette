import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import { reply } from "messages";

export async function setPity(
	interaction: Djs.CommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation
) {
	const pity = options.getInteger(t("config.pity.option.name"));
	if (!pity) {
		client.settings.delete(interaction.guild!.id, "pity");
		return await reply(interaction, {
			content: ul("config.pity.delete"),
		});
	}
	client.settings.set(interaction.guild!.id, pity, "pity");
	return await reply(interaction, {
		content: ul("config.pity.success", { pity }),
	});
}
