import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import type * as Djs from "discord.js";
import { reply } from "messages";
import { formatDuration } from "./utils";

export async function deleteAfter(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	if (client.settings.get(interaction.guild.id, "disableThread"))
		return await reply(interaction, {
			content: ul("timer.error"),
		});

	const timer = options.getNumber(t("timer.option.name"), true);
	client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
	if (timer === 0) await interaction.reply({ content: ul("timer.delete", { timer }) });
	else
		await interaction.reply({
			content: ul("timer.success", { timer: formatDuration(timer) }),
		});
}

export async function timestamp(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "timestamp");
	if (toggle) {
		await reply(interaction, {
			content: ul("timestamp.enabled"),
		});
	} else {
		await reply(interaction, {
			content: ul("timestamp.disabled"),
		});
	}
}

/**
 * Enables or disables the display of context links in dice roll results for the guild.
 *
 * Updates the guild's settings to show or hide context links and replies with a localized confirmation message based on the new setting and the current message deletion timer.
 */
export async function setContextLink(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "context");
	const deleteLogs = client.settings.get(interaction.guild!.id, "deleteAfter") === 0;
	if (toggle) {
		if (deleteLogs)
			return await reply(interaction, {
				content: ul("anchor.enabled.noDelete"),
			});
		return await reply(interaction, {
			content: ul("anchor.enabled.logs"),
		});
	}
	return await reply(interaction, {
		content: ul("context.disabled"),
	});
}

export async function linkToLog(
	interaction: Djs.ChatInputCommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as Djs.CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "linkToLogs");
	if (toggle) {
		return await reply(interaction, {
			content: ul("linkToLog.enabled"),
		});
	}
	return await reply(interaction, {
		content: ul("linkToLog.disabled"),
	});
}
