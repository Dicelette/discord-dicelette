import type { EventEmitter } from "node:events";
import { ln } from "@dicelette/localization";
import { startDashboardServer } from "@dicelette/server";
import * as Djs from "discord.js";
import type { EClient } from "./client";
import { templateEmbed } from "./commands/admin/template";
import { bulkEditTemplateUserCore, createDefaultThread } from "./messages";

export function startBotDashboard(client: EClient, guildEvents: EventEmitter): void {
	startDashboardServer({
		guildEvents,
		settings: client.settings,
		userSettings: client.userSettings,
		template: client.template,
		characters: client.characters,
		bulkEditTemplateUser: (guildId, template) => {
			const lang = client.settings.get(guildId, "lang");
			const ul = ln(lang ?? Djs.Locale.EnglishUS);
			return bulkEditTemplateUserCore(client, guildId, template, ul);
		},
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
								roleIds: [...m.roles.cache.keys()],
							};
						} catch {
							return null;
						}
					},
					fetchMemberName: async (userId) => {
						try {
							const m =
								guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));
							return `@${m.user.username}`;
						} catch {
							return null;
						}
					},
					get channels() {
						return [...guild.channels.cache.values()].map((c) => ({
							id: c.id,
							name: c.name,
							type: c.type as number,
							// biome-ignore lint/style/useNamingConvention: Say that to discord
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
				let channel: Djs.Channel | null | undefined =
					client.channels.cache.get(channelId);
				if (!channel) {
					try {
						channel = await client.channels.fetch(channelId);
					} catch {
						return null;
					}
				}
				if (!channel?.isTextBased()) return null;
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
				let channel: Djs.Channel | null | undefined =
					client.channels.cache.get(channelId);
				if (!channel) {
					try {
						channel = await client.channels.fetch(channelId);
					} catch {
						return false;
					}
				}
				if (!channel?.isTextBased()) return false;
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
				publicChannelId,
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
					// If no public channel provided and the template channel supports threads,
					// we create/retrieve the default thread to store character sheets.
					let resolvedPublicChannelId: string | undefined = publicChannelId;
					if (!resolvedPublicChannelId && channel instanceof Djs.TextChannel) {
						try {
							const thread = await createDefaultThread(
								channel,
								client.settings,
								client.guilds.cache.get(guildId),
								false
							);
							if (thread) resolvedPublicChannelId = thread.id;
						} catch {
							// Non-fatal: thread will be created on next registration
						}
					}
					return { messageId: msg.id, publicChannelId: resolvedPublicChannelId };
				} catch {
					return null;
				}
			},
		},
	});
}
