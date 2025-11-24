import type { EClient } from "@dicelette/bot-core";
import { t } from "@dicelette/localization";
import type { Translation } from "@dicelette/types";
import dedent from "dedent";
import * as Djs from "discord.js";
import { reply } from "messages";

export async function setErrorLogs(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const channel = options.getChannel(ul("common.channel"), false);
	// noinspection SuspiciousTypeOfGuard
	if (
		!channel ||
		(!(channel instanceof Djs.TextChannel) && !(channel instanceof Djs.ThreadChannel))
	) {
		const oldChan = client.settings.get(interaction.guild!.id, "logs");
		client.settings.delete(interaction.guild!.id, "logs");
		const msg = oldChan
			? ` ${ul("logs.inChan", { chan: Djs.channelMention(oldChan) })}`
			: ".";
		await reply(interaction, {
			content: `${ul("logs.delete")}${msg}`,
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "logs");
	await reply(interaction, {
		content: ul("logs.set", { channel: Djs.channelMention(channel.id) }),
	});
}

export async function resultChannel(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	await interaction.deferReply();
	const channel = options.getChannel(t("common.channel"));
	const oldChan = client.settings.get(interaction.guild!.id, "rollChannel");
	const disable = options.getBoolean(t("disableThread.name"));
	if (!channel && !oldChan && disable === null) {
		return await interaction.followUp({
			content: ul("changeThread.noChan"),
		});
	}
	if (disable === true) return await disableThread(interaction, client, ul, true);
	if (
		!channel ||
		(channel.type !== Djs.ChannelType.GuildText &&
			!(channel instanceof Djs.ThreadChannel))
	) {
		client.settings.delete(interaction.guild.id, "rollChannel");
		if (oldChan)
			await interaction.followUp({
				content: `${ul("changeThread.delete")} ${ul("logs.inChan", { chan: oldChan })}`,
			});
		if (disable === false) return await disableThread(interaction, client, ul, false);
		return await disableThread(interaction, client, ul, true);
	}
	client.settings.set(interaction.guild.id, channel.id, "rollChannel");
	await interaction.followUp(
		dedent(`
		- ${ul("changeThread.set", { channel: Djs.channelMention(channel.id) })}
		- ${ul("disableThread.enable.autoDelete")}
		`)
	);
	return await disableThread(interaction, client, ul, false, true);
}

export async function disableThread(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	toggle: boolean,
	silent?: boolean
) {
	//toggle TRUE = disable thread creation
	//toggle FALSE = enable thread creation
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	if (toggle) {
		client.settings.set(interaction.guild!.id, true, "disableThread");
		if (rollChannel && !silent) {
			const mention = `<#${rollChannel}>`;
			const msg = `${ul("disableThread.disable.reply")}
			- ${ul("disableThread.disable.mention", { mention })}
			- ${ul("disableThread.disable.prefix")}
			- ${ul("disableThread.disable.autoDelete")}`;
			await interaction.followUp(dedent(msg));
			return;
		}
		if (!silent)
			await interaction.followUp(
				dedent(`${ul("disableThread.disable.reply")}
					- ${ul("disableThread.disable.prefix")}
					- ${ul("disableThread.disable.autoDelete")}`)
			);
		return;
	}
	client.settings.delete(interaction.guild!.id, "disableThread");
	if (rollChannel && !silent) {
		const mention = `<#${rollChannel}>`;
		const msg = `${ul("disableThread.enable.mention", { mention })}
		${ul("disableThread.enable.autoDelete")}`;
		await interaction.followUp(dedent(msg));
		return;
	}
	if (!silent)
		await interaction.followUp(
			dedent(`
		${ul("disableThread.enable.reply")}
	- ${ul("disableThread.enable.prefix")}
	- ${ul("disableThread.enable.autoDelete")}`)
		);
	return;
}

export async function hiddenRoll(
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	options: Djs.CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	const channel = options.getChannel(t("common.channel"), false);
	if (!toggle) {
		//disable
		client.settings.delete(interaction.guild!.id, "hiddenRoll");
		await reply(interaction, {
			content: ul("hidden.disabled"),
		});
		return;
	}
	if (!channel) {
		client.settings.set(interaction.guild!.id, true, "hiddenRoll");
		await reply(interaction, {
			content: ul("hidden.enabled"),
		});
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "hiddenRoll");
	await reply(interaction, {
		content: ul("hidden.enabledChan", {
			channel: Djs.channelMention(channel.id),
		}),
	});
	return;
}
