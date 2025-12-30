import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import { reply } from "messages";
export async function disableCompare(
	interaction: Djs.CommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation
) {
	const enable = options.getBoolean(t("disableThread.options.name"), true);
	if (!enable) {
		client.settings.delete(interaction.guild!.id, "disableCompare");
		const example = `*<@${client.user?.id}>* (\`> 20\`)
 **${ul("common.failure")}** — \`1d20\` ⟶ \`[5]\` = \`[5] < 20\``;
		await reply(interaction, {
			content: ul("disableCompare.success.disabled", { example }),
		});
	} else {
		const example = `*<@${client.user?.id}>*
 \`1d20>20\` ⟶ \`[8]\` = \` [0] \``;
		client.settings.set(interaction.guild!.id, true, "disableCompare");
		await reply(interaction, {
			content: ul("disableCompare.success.enabled", { example }),
		});
	}
}
