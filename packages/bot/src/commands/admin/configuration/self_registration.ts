import type { EClient } from "@dicelette/bot-core";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type * as Djs from "discord.js";
import { reply } from "messages";

export async function allowSelfRegistration(
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	let toggle: boolean | string = options.getBoolean(
		t("disableThread.options.name"),
		true
	);
	const forceModeration = options.getBoolean(
		t("config.selfRegister.moderation.name"),
		false
	);
	const allowChannel = options.getBoolean(t("config.selfRegister.channel.name"), false);
	if (forceModeration) toggle = "moderation";
	if (allowChannel) toggle += "_channel";
	client.settings.set(interaction.guild!.id, toggle, "allowSelfRegister");
	if (!toggle) {
		return await reply(interaction, {
			content: ul("config.selfRegister.disable"),
		});
	}
	const template = client.settings.get(interaction.guild!.id, "templateID");
	const url =
		template?.channelId && template?.messageId
			? ` (https://discord.com/channels/${interaction.guild!.id}/${template?.channelId}/${template?.messageId})`
			: "";
	let msg = ul("config.selfRegister.enable", { url });
	if (toggle.toString().startsWith("moderation")) {
		logger.trace(
			`Self registration enabled with moderation for ${interaction.guild!.name}`
		);
		msg += `\n\n**__${ul("config.selfRegister.enableModeration")}__**`;
	}
	if (toggle.toString().endsWith("channel")) {
		logger.trace(
			`Self registration enabled with disallow channel for ${interaction.guild!.name}`
		);
		msg += `\n\n**__${ul("config.selfRegister.disableChannel")}__**`;
	}
	return await reply(interaction, {
		content: msg,
	});
}
