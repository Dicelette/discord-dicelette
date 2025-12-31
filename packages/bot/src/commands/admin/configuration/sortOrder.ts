import type { EClient } from "@dicelette/client";
import { SortOrder } from "@dicelette/core";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import { reply } from "messages";

export function setSortOrder(
	interaction: Djs.CommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation
) {
	const sortOrder = options.getString(t("config.sort.option.name"));
	if (!sortOrder || sortOrder === SortOrder.None) {
		client.settings.delete(interaction.guild!.id, "sortOrder");
		return reply(interaction, ul("config.sort.order.reset"));
	}
	client.settings.set(interaction.guild!.id, sortOrder, "sortOrder");
	return reply(
		interaction,
		ul("config.sort.order.set", {
			order:
				sortOrder === SortOrder.Ascending
					? ul("config.sort.options.ascending").toLowerCase()
					: ul("config.sort.options.descending").toLowerCase(),
		})
	);
}
