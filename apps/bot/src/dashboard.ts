import type { EventEmitter } from "node:events";
import { startDashboardServer } from "@dicelette/dashboard";
import { ln } from "@dicelette/localization";
import * as Djs from "discord.js";
import type { EClient } from "./client";
import { templateEmbed } from "./commands/admin/template";

export function startBotDashboard(client: EClient, guildEvents: EventEmitter): void {
	startDashboardServer({
		guildEvents,
		settings: client.settings,
		userSettings: client.userSettings,
		template: client.template,
		characters: client.characters,
		botGuilds: {
			has: (id) => client.guilds.cache.has(id),
			get: (id) => {
				const guild = client.guilds.cache.get(id);
				if (!guild) return undefined;
				return {
					fetchMember: async (userId) => {
						try {
							// Check in-memory cache first (populated by GuildMembers intent),
							// fall back to API only if the member isn't cached yet.
							const m =
								guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));
							return {
								hasPermission: (flag: bigint) => (m.permissions.bitfield & flag) !== 0n,
							};
						} catch {
							return null;
						}
					},
					get channels() {
						return [...guild.channels.cache.values()].map((c) => ({
							id: c.id,
							name: c.name,
							type: c.type as number,
							parent_id: c.parentId ?? null,
						}));
					},
					get roles() {
						return [...guild.roles.cache.values()]
							.filter((r) => r.id !== guild.id) // exclude @everyone (id === guildId)
							.map((r) => ({
								id: r.id,
								name: r.name,
								color: r.colors?.primaryColor ?? 0,
							}));
					},
				};
			},
		},
		botChannels: {
			fetchMessage: async (channelId, messageId) => {
				const channel = client.channels.cache.get(channelId);
				if (!channel || !channel.isTextBased()) return null;
				try {
					const msg =
						channel.messages.cache.get(messageId) ??
						(await channel.messages.fetch(messageId));
					return {
						embeds: msg.embeds.map((e) => ({
							title: e.title ?? undefined,
							thumbnail: e.thumbnail ? { url: e.thumbnail.url } : undefined,
							fields: e.fields as ReadonlyArray<{ name: string; value: string }>,
						})),
						attachments: [...msg.attachments.values()].map((a) => ({
							filename: a.name,
							url: a.url,
						})),
					};
				} catch {
					return null;
				}
			},
			deleteMessage: async (channelId, messageId) => {
				const channel = client.channels.cache.get(channelId);
				if (!channel || !channel.isTextBased()) return false;
				try {
					const msg =
						channel.messages.cache.get(messageId) ??
						(await channel.messages.fetch(messageId));
					await msg.delete();
					return true;
				} catch {
					return false;
				}
			},
			sendTemplate: async (
				channelId,
				template,
				guildId,
				_publicChannelId,
				_privateChannelId
			) => {
				let channel = client.channels.cache.get(channelId);
				if (!channel) {
					try {
						channel = (await client.channels.fetch(channelId)) ?? undefined;
					} catch {
						return null;
					}
				}
				if (!(channel instanceof Djs.BaseGuildTextChannel)) return null;
				try {
					const lang = client.settings.get(guildId, "lang");
					const ul = ln(lang ?? Djs.Locale.EnglishUS);
					const { embeds, components } = templateEmbed(template, ul);
					const msg = await (channel as Djs.TextChannel).send({
						components: [components],
						embeds: embeds,
						files: [
							{
								attachment: Buffer.from(JSON.stringify(template, null, 2), "utf-8"),
								name: "template.json",
							},
						],
					});
					try {
						await msg.pin();
					} catch {
						// Missing permissions — non-fatal
					}
					return { messageId: msg.id };
				} catch {
					return null;
				}
			},
		},
	});
}
