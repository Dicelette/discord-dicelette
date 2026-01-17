import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { LINKS, type Translation } from "@dicelette/types";
import { humanizeDuration } from "@dicelette/utils";
import dedent from "dedent";
import * as Djs from "discord.js";
import { VERSION } from "../../..";

export const info = {
	data: new Djs.SlashCommandBuilder()
		.setNames("info.title")
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setContexts(
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescriptions("info.description"),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { ul, langToUse } = getLangAndConfig(client, interaction);
		const botStats = getBotStats(client, ul);
		const buttons = buttonsLinks(ul, langToUse);
		const pres = dedent(ul("info.presentation"));
		const embeds: Djs.EmbedBuilder = new Djs.EmbedBuilder()
			.setDescription(pres)
			.addFields(botStats)
			.setColor("Random")
			.setFooter({ text: `Dicelette © 2023-${new Date().getFullYear()}` })
			.setAuthor({
				name: ul("info.author"),
			})
			.setThumbnail("https://dicelette.github.io/img/dicelette.png")
			.setTimestamp();
		return await interaction.reply({
			components: [new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(buttons)],
			embeds: [embeds],
			flags: Djs.MessageFlags.Ephemeral,
		});
	},
};

function getBotStats(client: EClient, ul: Translation) {
	const guildCount = client.guilds.cache.size;
	const uptime = humanizeDuration(client.uptime ?? 0);
	const latency = `${Math.round(client.ws.ping)}`;
	const status = client.ws.status;
	switch (status) {
		case Djs.Status.Ready:
			break;
		case Djs.Status.Reconnecting:
			latency.concat(` (${ul("help.stats.reconnecting")})`);
			break;
		case Djs.Status.Resuming:
			latency.concat(` (${ul("help.stats.resuming")})`);
			break;
		case Djs.Status.Connecting:
			latency.concat(` (${ul("help.stats.connecting")})`);
			break;
		case Djs.Status.Idle:
			latency.concat(` (${ul("help.stats.idle")})`);
			break;
		case Djs.Status.Nearly:
			latency.concat(` (${ul("help.stats.nearly")})`);
			break;
		default:
			latency.concat(` (${ul("help.stats.disconnected")})`);
			break;
	}

	return [
		{
			name: ul("info.count"),
			value: `\`${guildCount}\``,
		},
		{
			name: ul("info.uptime"),
			value: `\`${uptime}\``,
		},
		{
			name: ul("info.latency"),
			value: `\`${latency} ms\``,
		},
		{
			name: ul("info.version"),
			value: `\`${VERSION}\``,
		},
	];
}

function buttonsLinks(ul: Translation, langToUse: Djs.Locale) {
	const isProd = process.env.NODE_ENV === "production" ? "prod" : "dev";
	const emoji = LINKS.icons[isProd];
	const buttons = LINKS.buttons;
	return [
		new Djs.ButtonBuilder()
			.setLabel("Discord")
			.setStyle(Djs.ButtonStyle.Link)
			.setEmoji({ id: emoji.discord })
			.setURL(buttons.discord),
		new Djs.ButtonBuilder()
			.setLabel("GitHub")
			.setStyle(Djs.ButtonStyle.Link)
			.setEmoji({ id: emoji.github })
			.setURL(buttons.github),
		new Djs.ButtonBuilder()
			.setLabel(ul("info.kofi"))
			.setStyle(Djs.ButtonStyle.Link)
			.setEmoji({ id: emoji.kofi })
			.setURL(buttons.kofi),
		new Djs.ButtonBuilder()
			.setLabel(ul("info.docs"))
			.setStyle(Djs.ButtonStyle.Link)
			.setEmoji("📖")
			.setURL(langToUse === "fr" ? LINKS.fr.docs : LINKS.en.docs),
	];
}
