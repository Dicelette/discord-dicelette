import { t } from "@dicelette/localization";
import type { StripOOC, Translation } from "@dicelette/types";
import type { EClient } from "client";
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
	const channel = options.getChannel(t("config.stripOOC.channel.name"), false);

	if ((!prefix && !suffix && !regex) || timer === 0) {
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
				Djs.ChannelType.PublicThread
			)
			.setPlaceholder(ul("config.stripOOC.channel.placeholder"))
			.setMinValues(1)
			.setMaxValues(25)
	);
	const response = await interaction.reply({
		content: ul("config.stripOOC.select"),
		components: [row],
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
			filter: collectorFilter,
			componentType: Djs.ComponentType.ChannelSelect,
			time: 60_000, // Timeout en ms
		});
		selection.on("collect", async (i) => {
			const values = i.values;

			if (values.length > 0) {
				const stripOOC: Partial<StripOOC> = {
					regex: regex,
					timer: timer ? timer * 1000 : 0,
					forwardId: channel?.id ?? undefined,
					categoryId: values,
				};
				client.settings.set(interaction.guildId!, stripOOC, "stripOOC");
				await interaction.editReply({
					components: [],
					content: ul("config.stripOOC.success", {
						regex: regex ?? ul("common.no"),
						timer: timer ? `${timer}s` : ul("common.no"),
						channel: channel ? Djs.channelMention(channel.id) : ul("common.no"),
						categories: values.map((v) => Djs.channelMention(v)).join("\n- "),
					}),
				});
			}
		});
		selection.on("end", async (collected, reason) => {
			if (reason === "time") {
				await interaction.editReply({
					content: ul("config.stripOOC.timeOut"),
					components: [],
				});
			} else if (collected.size === 0) {
				await interaction.editReply({
					content: ul("config.stripOOC.noSelection"),
					components: [],
				});
			}
		});
	} catch (e) {
		console.error("Error in stripOOC selection:", e);
		await interaction.editReply({
			content: ul("config.stripOOC.timeOut"),
			components: [],
		});
		return;
	}
}

function escapeRegex(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
