import type { EClient } from "@dicelette/client";
import type { StatisticalTemplate } from "@dicelette/core";
import { cmdLn, t } from "@dicelette/localization";
import type { DiscordChannel, UserData } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { getTemplateByInteraction, getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	createEmbedsList,
	createStatsEmbed,
	createUserEmbed,
	reply,
	repostInThread,
} from "messages";
import { parseCSV } from "utils";
import "discord_ext";
import {
	addAutoRole,
	fetchAvatarUrl,
	getInteractionContext as getLangAndConfig,
	reuploadAvatar,
} from "@dicelette/bot-helpers";
import { COMPILED_PATTERNS } from "@dicelette/utils";

// Small helpers to reduce repetition and control concurrency
// getFileExtension: safer/more readable than chaining split/pop
const getFileExtension = (name: string): string => {
	const idx = name.lastIndexOf(".");
	return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
};

// Tiny p-limit implementation to cap parallel work and avoid rate-limit bursts
function pLimit(concurrency: number) {
	let activeCount = 0;
	const queue: Array<() => void> = [];

	const next = () => {
		activeCount--;
		queue.shift()?.();
	};

	return function limit<T>(fn: () => Promise<T>): Promise<T> {
		if (activeCount >= concurrency) {
			return new Promise<T>((resolve, reject) => {
				queue.push(() => {
					activeCount++;
					fn().then(resolve).catch(reject).finally(next);
				});
			});
		}
		activeCount++;
		return fn().finally(next);
	};
}

type UlTranslator = ReturnType<typeof getLangAndConfig>["ul"];

// buildEmbedsForCharacter: centralize embed construction for user, stats, dice and template
async function buildEmbedsForCharacter(
	ul: UlTranslator,
	char: UserData,
	member: Djs.User,
	interaction: Djs.ChatInputCommandInteraction,
	guildTemplate: StatisticalTemplate
) {
	const files: Djs.AttachmentBuilder[] = [];

	// Re-upload avatar if it's a Discord CDN link
	if (char.avatar?.match(COMPILED_PATTERNS.DISCORD_CDN)) {
		const res = await reuploadAvatar(
			{
				name: char.avatar.split("?")[0].split("/").pop() ?? "avatar.png",
				url: char.avatar,
			},
			ul
		);
		files.push(res.newAttachment);
		char.avatar = res.name;
	}

	const avatarUrl =
		char.avatar ?? (await fetchAvatarUrl(interaction.guild!, member as Djs.User));

	const userDataEmbed = createUserEmbed(
		ul,
		avatarUrl,
		member.id,
		char.userName ?? undefined
	);

	char.avatar = userDataEmbed.toJSON()?.thumbnail?.url;

	const statsEmbed = char.stats ? createStatsEmbed(ul) : undefined;
	let diceEmbed = guildTemplate.damage ? createDiceEmbed(ul) : undefined;

	// Statistics fields (no bounds validation here by design for bulk imports)
	for (const [name, value] of Object.entries(char.stats ?? {})) {
		const validateValue = guildTemplate.statistics?.[name];
		const fieldValue = validateValue?.combinaison
			? `\`${validateValue.combinaison}\` = ${value}`
			: `\`${value}\``;
		statsEmbed?.addFields({ inline: true, name: name.capitalize(), value: fieldValue });
	}

	// Default dice from template
	for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
		diceEmbed?.addFields({
			inline: true,
			name: name.capitalize(),
			value: (dice as string).trim().length > 0 ? `\`${dice}\`` : "_ _",
		});
	}

	// Character-specific dice override/additions
	for (const [name, dice] of Object.entries(char.damage ?? {})) {
		if (!diceEmbed) diceEmbed = createDiceEmbed(ul);
		diceEmbed.addFields({
			inline: true,
			name: name.capitalize(),
			value: (dice as string).trim().length > 0 ? `\`${dice}\`` : "_ _",
		});
	}

	// Template embed (diceType / critical rules)
	let templateEmbed: Djs.EmbedBuilder | undefined;
	if (guildTemplate.diceType || guildTemplate.critical) {
		templateEmbed = new Djs.EmbedBuilder()
			.setTitle(ul("embed.template"))
			.setColor("DarkerGrey");
		templateEmbed.addFields({
			inline: true,
			name: ul("common.dice").capitalize(),
			value: `\`${guildTemplate.diceType}\``,
		});
		if (guildTemplate.critical?.success) {
			templateEmbed.addFields({
				inline: true,
				name: ul("roll.critical.success"),
				value: `\`${guildTemplate.critical.success}\``,
			});
		}
		if (guildTemplate.critical?.failure) {
			templateEmbed.addFields({
				inline: true,
				name: ul("roll.critical.failure"),
				value: `\`${guildTemplate.critical.failure}\``,
			});
		}
	}

	const embeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
	return {
		embeds,
		files,
		flags: { dice: !!diceEmbed, stats: !!statsEmbed, template: !!templateEmbed },
	};
}

// deleteOldMessageIfNeeded: attempts to remove previous message tied to this character
async function deleteOldMessageIfNeeded(
	shouldDelete: boolean,
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction,
	memberId: string,
	charName?: string,
	oldUserData?: UserData
) {
	if (!shouldDelete) return;
	// If the caller provided the previous stored user data (fetched before creating a new message),
	// prefer that to avoid racing with the freshly created message which is already registered.
	const oldChar =
		oldUserData ??
		(
			await getUserFromInteraction(client, memberId, interaction, charName, {
				fetchChannel: true,
				fetchMessage: true,
			})
		)?.userData;
	if (!oldChar) return;
	const channelId = oldChar.channel;
	if (!channelId) return;
	const channel = interaction.guild?.channels.cache.get(channelId);
	const messageId = oldChar.messageId;
	if (channel && messageId) {
		try {
			const oldMessage = await (channel as DiscordChannel)?.messages.fetch(messageId);
			if (oldMessage) await oldMessage.delete();
		} catch (error) {
			// Skip unknown message errors quietly during bulk operations
			logger.warn(error);
		}
	}
}

// processCharacter: single-character import workflow wrapped for batching/concurrency
async function processCharacter(params: {
	interaction: Djs.ChatInputCommandInteraction;
	client: EClient;
	ul: UlTranslator;
	guildTemplate: StatisticalTemplate;
	member: Djs.User;
	char: UserData;
	shouldDelete: boolean;
	defaultChannel: string;
	privateChannel?: string;
	errorsRef: string[];
}) {
	const {
		interaction,
		client,
		ul,
		guildTemplate,
		member,
		char,
		shouldDelete,
		defaultChannel,
		privateChannel,
		errorsRef,
	} = params;

	try {
		const { embeds, files, flags } = await buildEmbedsForCharacter(
			ul,
			char,
			member,
			interaction,
			guildTemplate
		);

		const targetChannel =
			char.channel ?? (char.private && privateChannel ? privateChannel : defaultChannel);

		// Fetch previous stored user data before creating a new message. This prevents a race where
		// the newly posted message is immediately considered the "old" one and deleted.
		const previous = (
			await getUserFromInteraction(
				client,
				member.id,
				interaction,
				char.userName ?? undefined,
				{
					fetchChannel: true,
					fetchMessage: true,
				}
			)
		)?.userData;

		await repostInThread(
			embeds,
			interaction,
			char,
			member.id,
			ul,
			flags,
			client.settings,
			targetChannel,
			client.characters,
			files
		);

		await addAutoRole(interaction, member.id, flags.dice, flags.stats, client.settings);
		await deleteOldMessageIfNeeded(
			shouldDelete,
			client,
			interaction,
			member.id,
			char.userName ?? undefined,
			previous
		);
		await reply(interaction, {
			content: ul("import.success", { user: Djs.userMention(member.id) }),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.warn(
			`[import] Failed for user ${member.id} (${char?.userName ?? "?"}): ${message}`
		);
		errorsRef.push(`${member.username}: ${message}`);
	}
}

/**
 * ! Note: Bulk data doesn't allow to register dice-per-user, as each user can have different dice
 * I don't want to think about a specific way to handle this, so I will just ignore it for now.
 */
export const bulkAdd = {
	data: new Djs.SlashCommandBuilder()
		.setNames("import.name")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setDescriptions("import.description")
		.addAttachmentOption((option) =>
			option
				.setNames("csv_generation.name")
				.setDescriptions("import.options.description")
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option.setNames("import.delete.title").setDescriptions("import.delete.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const csvFile = options.getAttachment(t("csv_generation.name"), true);
		const { langToUse, ul } = getLangAndConfig(client, interaction);
		await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });
		const ext = getFileExtension(csvFile.name);
		if (!ext || ext !== "csv") {
			return reply(interaction, {
				content: ul("import.errors.invalid_file", { ext }),
			});
		}
		/** download the file using paparse */
		const guildTemplate = await getTemplateByInteraction(interaction, client);
		if (!guildTemplate) {
			return reply(interaction, {
				content: ul("error.template.notFound", {
					guildId: interaction.guild?.name ?? interaction.guildId ?? "unknow guild",
				}),
			});
		}
		const { members, errors } = await parseCSV(
			csvFile.url,
			guildTemplate,
			interaction,
			!!client.settings.get(interaction.guild!.id, "privateChannel"),
			langToUse
		);
		const defaultChannel = client.settings.get(interaction.guild!.id, "managerId");
		const privateChannel = client.settings.get(interaction.guild!.id, "privateChannel");
		if (!defaultChannel)
			return reply(interaction, {
				content: ul("error.channel.defaultChannel"),
			});

		const guildMembers = await interaction.guild?.members.fetch();

		const toDelete = !!options.getBoolean(t("import.delete.title"));
		const limit = pLimit(3); // Keep a low concurrency to respect Discord rate limits
		const asyncJobs: Promise<unknown>[] = [];
		const collectedErrors = [...errors];

		for (const [userId, chars] of Object.entries(members)) {
			// We already parsed the user, so the cache should be up to date
			const gm = guildMembers!.get(userId);
			const memberUser = gm?.user as Djs.User | undefined;
			if (!memberUser) continue;

			for (const char of chars) {
				asyncJobs.push(
					limit(() =>
						processCharacter({
							char,
							client,
							defaultChannel,
							errorsRef: collectedErrors,
							guildTemplate,
							interaction,
							member: memberUser,
							privateChannel,
							shouldDelete: toDelete,
							ul,
						})
					)
				);
			}
		}

		await Promise.allSettled(asyncJobs);

		let msg = ul("import.all_success");
		if (collectedErrors.length > 0)
			msg += `\n${ul("import.errors.global")}\n${collectedErrors.join("\n")}`;
		await reply(interaction, { content: msg });
		return;
	},
};

/** Allow to create a CSV file for easy edition
 * Need to be opened by excel or google sheet because CSV is not the best in notepad
 */

export const bulkAddTemplate = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("csv_generation.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("csv_generation.name"))
		.setDescription(t("csv_generation.description"))
		.setDescriptionLocalizations(cmdLn("csv_generation.description")),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const { ul } = getLangAndConfig(client, interaction);
		const guildTemplate = await getTemplateByInteraction(interaction, client);
		if (!guildTemplate) {
			return reply(interaction, {
				content: ul("error.template.notFound", {
					guildId: interaction.guild.name,
				}),
			});
		}
		const header = ["user", "charName", "avatar", "channel"];
		if (guildTemplate.statistics) {
			header.push(...Object.keys(guildTemplate.statistics));
		}
		if (client.settings.has(interaction.guild.id, "privateChannel"))
			header.push("isPrivate");
		header.push("dice");

		//create CSV
		const csvText = `\ufeff${header.join(";")}\n`;
		const buffer = Buffer.from(csvText, "utf-8");
		await interaction.reply({
			content: ul("csv_generation.success"),
			files: [{ attachment: buffer, name: "template.csv" }],
		});
	},
};
