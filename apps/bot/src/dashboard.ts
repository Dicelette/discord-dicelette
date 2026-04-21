import type { EventEmitter } from "node:events";
import { resolveCsvImportAvatar } from "@dicelette/helpers";
import { ln } from "@dicelette/localization";
import { startDashboardServer } from "@dicelette/server";
import type { UserData, UserGuildData } from "@dicelette/types";
import * as Djs from "discord.js";
import type { EClient } from "./client";
import { exportCharactersCsv } from "./commands/admin/export";
import { templateEmbed } from "./commands/admin/template";
import { getTemplate, updateMemory } from "./database";
import {
	bulkEditTemplateUserCore,
	createDefaultThread,
	createDiceEmbed,
	createEmbedsList,
	createStatsEmbed,
	createUserEmbed,
} from "./messages";
import { editUserButtons, parseCSV, selectEditMenu } from "./utils";
import "@dicelette/discord_ext";

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
					name: guild.name,
					icon: guild.icon,
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
					memberCanAccessChannel: async (userId, channelId) => {
						try {
							const member =
								guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));
							const channel =
								guild.channels.cache.get(channelId) ??
								(await guild.channels.fetch(channelId));
							if (!channel) return false;

							const permissions = channel.permissionsFor(member, true);
							if (!permissions) return false;

							return permissions.has([
								Djs.PermissionFlagsBits.ViewChannel,
								Djs.PermissionFlagsBits.ReadMessageHistory,
							]);
						} catch {
							return false;
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
			fetchMessage: async (channelId, messageId, options) => {
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
					const force = options?.force ?? false;
					if (force) channel.messages.cache.delete(messageId);
					const cachedMsg = force ? undefined : channel.messages.cache.get(messageId);
					const msg = cachedMsg ?? (await channel.messages.fetch(messageId));
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
			sendMessage: async (channelId, content) => {
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
					await (channel as Djs.TextChannel).send({ content });
					return true;
				} catch {
					return false;
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
			bulkImportCharacters: async (guildId, csvText, deleteOldMessages) => {
				const guild = client.guilds.cache.get(guildId);
				if (!guild) return { success: 0, failed: 0, errors: ["Guild not found"] };

				const lang = client.settings.get(guildId, "lang") ?? Djs.Locale.EnglishUS;
				const ul = ln(lang);

				const guildTemplate = await getTemplate(
					guild,
					client.settings,
					ul,
					client,
					true
				).catch(() => null);
				if (!guildTemplate)
					return {
						success: 0,
						failed: 0,
						errors: ["No template configured for this guild"],
					};

				const hasPrivate = !!client.settings.get(guildId, "privateChannel");
				const defaultChannelId = client.settings.get(guildId, "managerId") as
					| string
					| undefined;
				const privateChannelId = client.settings.get(guildId, "privateChannel") as
					| string
					| undefined;

				if (!defaultChannelId)
					return {
						success: 0,
						failed: 0,
						errors: ["No default channel configured"],
					};

				// parseCSV called without interaction: skips Discord member lookup,
				// uses raw userId from CSV directly (trusted since dashboard is admin-only)
				const { members, errors } = await parseCSV(
					csvText,
					guildTemplate,
					undefined,
					hasPrivate,
					lang
				);

				const collectedErrors = [...errors];
				let success = 0;
				let failed = 0;

				// Snapshot settings before processing to avoid race conditions
				const guildData = client.settings.get(guildId);
				if (!guildData)
					return { success: 0, failed: 0, errors: ["Guild data not found"] };
				if (!guildData.user) guildData.user = {};

				// Collect post results before committing to settings
				type PostResult = {
					userId: string;
					char: UserData;
					messageId: string;
					channelId: string;
					existingIdx: number;
				};
				const postResults: PostResult[] = [];

				// Pre-compute existing indices (before any insertions)
				const existingIndices = new Map<string, number>();
				for (const [userId, chars] of Object.entries(members)) {
					const userChars: UserGuildData[] = guildData.user[userId] ?? [];
					for (const char of chars) {
						const idx = userChars.findIndex(
							(c) => c.charName === char.userName || (!c.charName && !char.userName)
						);
						if (idx >= 0) existingIndices.set(`${userId}:${char.userName ?? ""}`, idx);
					}
				}

				// Delete old messages first if requested (before posting new ones)
				if (deleteOldMessages) {
					for (const [userId, chars] of Object.entries(members)) {
						const userChars: UserGuildData[] = guildData.user[userId] ?? [];
						for (const char of chars) {
							const key = `${userId}:${char.userName ?? ""}`;
							const idx = existingIndices.get(key);
							if (idx === undefined) continue;
							const old = userChars[idx];
							if (!old) continue;
							const [oldMsgId, oldChannelId] = old.messageId;
							try {
								const oldChan = await client.channels
									.fetch(oldChannelId)
									.catch(() => null);
								if (oldChan?.isTextBased()) {
									const oldMsg = await (oldChan as Djs.TextChannel).messages
										.fetch(oldMsgId)
										.catch(() => null);
									if (oldMsg) await oldMsg.delete();
								}
							} catch {
								// Silent: message may already be gone
							}
						}
					}
				}

				// Post all characters with bounded concurrency
				const limit = pLimit(3);
				const jobs: Promise<void>[] = [];

				for (const [userId, chars] of Object.entries(members)) {
					for (const char of chars) {
						jobs.push(
							limit(async () => {
								try {
									const targetChannelId =
										char.channel ??
										(char.private && privateChannelId
											? privateChannelId
											: defaultChannelId);

									const channel = await client.channels
										.fetch(targetChannelId)
										.catch(() => null);
									if (
										!channel ||
										(!channel.isTextBased() && !(channel instanceof Djs.ForumChannel))
									)
										throw new Error(
											`Channel ${targetChannelId} not found or not postable`
										);

									// Build embeds — same logic as buildEmbedsForCharacter in import.ts
									const memberUser =
										guild.members.cache.get(userId)?.user ??
										(await guild.members
											.fetch(userId)
											.then((m) => m.user)
											.catch(() => null));
									let userDataEmbed: Djs.EmbedBuilder;
									if (memberUser) {
										const resolvedAvatar = await resolveCsvImportAvatar({
											avatar: char.avatar,
											guild,
											user: memberUser,
										});
										userDataEmbed = createUserEmbed(
											ul,
											resolvedAvatar.avatarUrl,
											userId,
											char.userName ?? undefined
										);
										char.avatar = userDataEmbed.data?.thumbnail?.url;
									} else {
										userDataEmbed = createUserEmbed(
											ul,
											null,
											userId,
											char.userName ?? undefined
										);
									}

									const statsEmbed = char.stats ? createStatsEmbed(ul) : undefined;
									let diceEmbed = guildTemplate.damage ? createDiceEmbed(ul) : undefined;

									for (const [name, value] of Object.entries(char.stats ?? {})) {
										const validateValue = guildTemplate.statistics?.[name];
										const fieldValue = validateValue?.combinaison
											? `\`${validateValue.combinaison}\` = ${value}`
											: `\`${value}\``;
										statsEmbed?.addFields({
											inline: true,
											name: name.capitalize(),
											value: fieldValue,
										});
									}

									for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
										diceEmbed?.addFields({
											inline: true,
											name: name.capitalize(),
											value: (dice as string).trim().length > 0 ? `\`${dice}\`` : "_ _",
										});
									}

									for (const [name, dice] of Object.entries(char.damage ?? {})) {
										if (!diceEmbed) diceEmbed = createDiceEmbed(ul);
										diceEmbed.addFields({
											inline: true,
											name: name.capitalize(),
											value: (dice as string).trim().length > 0 ? `\`${dice}\`` : "_ _",
										});
									}

									let templateEmbedBuilder: Djs.EmbedBuilder | undefined;
									if (guildTemplate.diceType || guildTemplate.critical) {
										templateEmbedBuilder = new Djs.EmbedBuilder()
											.setTitle(ul("embed.template"))
											.setColor("DarkerGrey");
										templateEmbedBuilder.addFields({
											inline: true,
											name: ul("common.dice").capitalize(),
											value: `\`${guildTemplate.diceType}\``,
										});
										if (guildTemplate.critical?.success)
											templateEmbedBuilder.addFields({
												inline: true,
												name: ul("roll.critical.success"),
												value: `\`${guildTemplate.critical.success}\``,
											});
										if (guildTemplate.critical?.failure)
											templateEmbedBuilder.addFields({
												inline: true,
												name: ul("roll.critical.failure"),
												value: `\`${guildTemplate.critical.failure}\``,
											});
									}

									const embeds = createEmbedsList(
										userDataEmbed,
										statsEmbed,
										diceEmbed,
										templateEmbedBuilder
									);
									const hasDice = !!diceEmbed;
									const hasStats = !!statsEmbed;

									const components = [
										editUserButtons(ul, hasStats, hasDice),
										selectEditMenu(ul),
									];

									// Post message — forum channels get a new thread
									let msgId: string;
									let finalChannelId: string;

									if (channel instanceof Djs.ForumChannel) {
										const threadName = char.userName ?? ul("common.character");
										const newThread = await channel.threads.create({
											autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneWeek,
											message: { components, embeds },
											name: threadName,
										});
										const starter = await newThread.fetchStarterMessage();
										if (!starter)
											throw new Error("Could not fetch forum thread starter message");
										msgId = starter.id;
										finalChannelId = newThread.id;
									} else {
										const msg = await (channel as Djs.TextChannel).send({
											components,
											embeds,
										});
										msgId = msg.id;
										finalChannelId = channel.id;
									}

									const key = `${userId}:${char.userName ?? ""}`;
									postResults.push({
										char,
										channelId: finalChannelId,
										existingIdx: existingIndices.get(key) ?? -1,
										messageId: msgId,
										userId,
									});

									// Update in-memory character cache immediately
									await updateMemory(client.characters, guildId, userId, ul, {
										userData: char,
									});

									success++;
								} catch (err) {
									failed++;
									collectedErrors.push(err instanceof Error ? err.message : String(err));
								}
							})
						);
					}
				}

				await Promise.allSettled(jobs);

				// Commit all settings changes in one pass (sequential, no races)
				for (const r of postResults) {
					if (!guildData.user[r.userId]) guildData.user[r.userId] = [];
					const entry: UserGuildData = {
						charName: r.char.userName,
						isPrivate: r.char.private ?? false,
						messageId: [r.messageId, r.channelId],
					};
					if (r.existingIdx >= 0) guildData.user[r.userId][r.existingIdx] = entry;
					else guildData.user[r.userId].push(entry);
				}
				client.settings.set(guildId, guildData);

				return { success, failed, errors: collectedErrors };
			},
			exportCharactersCsv: (guildId, isPrivate) => {
				return exportCharactersCsv(client, guildId, isPrivate);
			},
		},
	});
}

function pLimit(concurrency: number) {
	let activeCount = 0;
	const queue: Array<() => void> = [];
	const next = () => {
		activeCount--;
		queue.shift()?.();
	};
	return async function limit<T>(fn: () => Promise<T>): Promise<T> {
		if (activeCount >= concurrency) {
			return new Promise<T>((resolve, reject) => {
				queue.push(() => {
					activeCount++;
					fn().then(resolve).catch(reject).finally(next);
				});
			});
		}
		activeCount++;
		try {
			return await fn();
		} finally {
			next();
		}
	};
}
