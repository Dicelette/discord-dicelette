import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import * as Djs from "discord.js";
import { reply } from "messages";

export function stats(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: Djs.CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.stats");
		return reply(interaction, {
			content: ul("autoRole.stat.remove"),
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.stats");
	return reply(interaction, {
		content: ul("autoRole.stat.set", { role: Djs.roleMention(role.id) }),
	});
}

export function dice(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: Djs.CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.dice");
		return reply(interaction, {
			content: ul("autoRole.dice.remove"),
		});
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.dice");
	return reply(interaction, {
		content: ul("autoRole.dice.set", { role: Djs.roleMention(role.id) }),
	});
}
