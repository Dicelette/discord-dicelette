import { cmdLn, t } from "@dicelette/localization";
import type { DiscordChannel } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import type { EClient } from "client";
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
import { addAutoRole, fetchAvatarUrl, getLangAndConfig, parseCSV } from "utils";
import "discord_ext";

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
		const ext = csvFile.name.split(".").pop()?.toLowerCase() ?? "";
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
		if (!defaultChannel) {
			return reply(interaction, {
				content: ul("error.channel.defaultChannel"),
			});
		}
		const guildMembers = await interaction.guild?.members.fetch();
		for (const [user, data] of Object.entries(members)) {
			//we already parsed the user, so the cache should be up to date
			let member: Djs.GuildMember | Djs.User | undefined = guildMembers!.get(user);
			if (!member || !member.user) {
				continue;
			}
			member = member.user as Djs.User;
			for (const char of data) {
				const userDataEmbed = createUserEmbed(
					ul,
					char.avatar ?? (await fetchAvatarUrl(interaction.guild!, member)),
					member.id,
					char.userName ?? undefined
				);

				const statsEmbed = char.stats ? createStatsEmbed(ul) : undefined;
				let diceEmbed = guildTemplate.damage ? createDiceEmbed(ul) : undefined;
				//! important: As the bulk add can be for level upped characters, the value is not verified (min/max) & total points
				for (const [name, value] of Object.entries(char.stats ?? {})) {
					const validateValue = guildTemplate.statistics?.[name];
					const fieldValue = validateValue?.combinaison
						? `\`${validateValue.combinaison}\` = ${value}`
						: `\`${value}\``;
					statsEmbed!.addFields({
						inline: true,
						name: name.capitalize(),
						value: fieldValue,
					});
				}
				for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
					diceEmbed!.addFields({
						inline: true,
						name: name.capitalize(),
						value: dice.trim().length > 0 ? `\`${dice}\`` : "_ _",
					});
				}

				for (const [name, dice] of Object.entries(char.damage ?? {})) {
					if (!diceEmbed) diceEmbed = createDiceEmbed(ul);
					diceEmbed!.addFields({
						inline: true,
						name: name.capitalize(),
						value: dice.trim().length > 0 ? `\`${dice}\`` : "_ _",
					});
				}

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
				const allEmbeds = createEmbedsList(
					userDataEmbed,
					statsEmbed,
					diceEmbed,
					templateEmbed
				);
				if (options.getBoolean(t("import.delete.title"))) {
					//delete old message if it exists
					const oldChar = (
						await getUserFromInteraction(client, member.id, interaction, char.userName, {
							fetchChannel: true,
							fetchMessage: true,
						})
					)?.userData;
					if (oldChar) {
						const channelId = oldChar.channel;
						if (channelId) {
							const channel = interaction.guild?.channels.cache.get(channelId);
							const messageId = oldChar.messageId;
							if (channel && messageId) {
								try {
									const oldMessage = await (channel as DiscordChannel)?.messages.fetch(
										messageId
									);
									if (oldMessage) await oldMessage.delete();
								} catch (error) {
									//skip unknown message
									logger.warn(error);
								}
							}
						}
					}
				}

				await repostInThread(
					allEmbeds,
					interaction,
					char,
					member.id,
					ul,
					{ dice: !!diceEmbed, stats: !!statsEmbed, template: !!templateEmbed },
					client.settings,
					char.channel ??
						(char.private && privateChannel ? privateChannel : defaultChannel),
					client.characters
				);
				await addAutoRole(
					interaction,
					member.id,
					!!diceEmbed,
					!!statsEmbed,
					client.settings
				);
				await reply(interaction, {
					content: ul("import.success", { user: Djs.userMention(member.id) }),
				});
			}
		}
		let msg = ul("import.all_success");
		if (errors.length > 0) msg += `\n${ul("import.errors.global")}\n${errors.join("\n")}`;
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
