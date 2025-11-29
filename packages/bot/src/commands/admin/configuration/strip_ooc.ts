import { fetchChannel } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import type { StripOOC, Translation } from "@dicelette/types";
import { sentry } from "@dicelette/utils";
import * as Djs from "discord.js";
import { reply } from "messages";

export async function stripOOC(
	options: Djs.CommandInteractionOptionResolver,
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	const prefix = options.getString(t("config.stripOOC.prefix.name"), false);
	const suffix = options.getString(t("config.stripOOC.suffix.name"), false);
	let regex = options.getString(t("config.stripOOC.regex.name"), false);
	const timer = options.getNumber(t("config.stripOOC.timer.name"), false);
	let channel = options.getChannel(t("common.channel"), false);
	const threadMode = options.getBoolean(t("config.stripOOC.thread_mode.name"), false);
	if ((!prefix && !suffix && !regex && !timer) || timer === 0) {
		//delete
		client.settings.delete(interaction.guild!.id, "stripOOC");
		await reply(interaction, {
			content: ul("config.stripOOC.delete"),
		});
		return;
	}
	if (!prefix && !suffix && !regex) {
		throw new Error(ul("config.stripOOC.error"));
	}
	if (!timer || timer <= 0) {
		throw new Error(ul("config.stripOOC.timer.error"));
	}
	if (regex) {
		//validate regex
		if (!regex.startsWith("^")) regex = `^${regex}`;
		if (!regex.endsWith("$")) regex = `${regex}$`;
		try {
			new RegExp(regex);
		} catch (e) {
			throw new Error(ul("config.stripOOC.regex.error", { e }));
		}
	}
	//construct regex based on prefix/suffix
	if (suffix && prefix && !regex) {
		regex = `^${escapeRegex(prefix)}(.*)${escapeRegex(suffix)}$`;
	}
	if (!regex) throw new Error(ul("config.stripOOC.error"));
	const row = new Djs.ActionRowBuilder<Djs.ChannelSelectMenuBuilder>().addComponents(
		new Djs.ChannelSelectMenuBuilder()
			.setCustomId("stripOoc_select")
			.setChannelTypes(
				Djs.ChannelType.GuildText,
				Djs.ChannelType.GuildCategory,
				Djs.ChannelType.PrivateThread,
				Djs.ChannelType.PublicThread,
				Djs.ChannelType.GuildForum
			)
			.setPlaceholder(ul("config.stripOOC.channel.placeholder"))
			.setMinValues(1)
			.setMaxValues(25)
	);
	const response = await interaction.reply({
		components: [row],
		content: ul("config.stripOOC.select"),
		withResponse: true,
	});
	try {
		const collectorFilter: (
			i: Djs.StringSelectMenuInteraction | Djs.ChannelSelectMenuInteraction
		) => boolean = (i) =>
			i.user.id === interaction.user.id && i.customId === "stripOoc_select";
		if (!response.resource?.message) {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(ul("error.failedReply"));
		}
		const selection = response.resource.message.createMessageComponentCollector({
			componentType: Djs.ComponentType.ChannelSelect,
			filter: collectorFilter,
			time: 60_000, // Timeout en ms
		});
		selection.on("collect", async (i) => {
			const values = i.values;

			if (values.length > 0) {
				if (threadMode) channel = null;
				const stripOOC: Partial<StripOOC> = {
					categoryId: values,
					forwardId: channel?.id ?? undefined,
					regex: regex,
					threadMode: threadMode ?? false,
					timer: timer ? timer * 1000 : 0,
				};
				const categories = (
					await Promise.all(values.map((v) => isCatOrChannel(v, interaction.guild!)))
				)
					.filter((v) => v !== undefined)
					.join("\n- ");

				client.settings.set(interaction.guildId!, stripOOC, "stripOOC");
				await interaction.editReply({
					components: [],
					content: ul("config.stripOOC.success", {
						categories,
						channel: channel ? Djs.channelMention(channel.id) : ul("common.no"),
						regex: regex ?? ul("common.no"),
						threadMode: threadMode ? ul("common.yes") : ul("common.no"),
						timer: timer ? `${timer}s` : ul("common.no"),
					}),
				});
			}
		});
	} catch (e) {
		console.error("Error in stripOOC selection:", e);
		sentry.error("Error in stripOOC selection", { error: e });
		await interaction.editReply({
			components: [],
			content: ul("config.stripOOC.timeOut"),
		});
		return;
	}
}

function escapeRegex(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function isCatOrChannel(channel: string, guild: Djs.Guild) {
	const fetched = await fetchChannel(guild, channel);
	if (!fetched) return undefined;
	if (fetched.isTextBased()) return Djs.channelMention(channel);
	if (fetched.type === Djs.ChannelType.GuildCategory) return `📂 ${fetched.name}`;
	if (fetched.type === Djs.ChannelType.GuildForum) return `<#${fetched.id}>`;
}
