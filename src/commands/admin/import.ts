import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "@interactions";
import { cmdLn, ln, t } from "@localization";
import type { EClient } from "@main";
import { addAutoRole, reply, repostInThread } from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { parseCSV } from "@utils/import_csv";
import { createEmbedsList } from "@utils/parse";
import * as Djs from "discord.js";

/**
 * ! Note: Bulk data doesn't allow to register dice-per-user, as each user can have different dice
 * I don't want to think about a specific way to handle this, so I will just ignore it for now.
 */
export const bulkAdd = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("import.name"))
		.setDMPermission(false)
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("import.name"))
		.setDescription(t("import.description"))
		.setDescriptionLocalizations(cmdLn("import.description"))
		.addAttachmentOption((option) =>
			option
				.setName(t("import.options.name"))
				.setNameLocalizations(cmdLn("import.options.name"))
				.setDescription(t("import.options.description"))
				.setDescriptionLocalizations(cmdLn("import.options.description"))
				.setRequired(true)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const csvFile = options.getAttachment(t("import.options.name"), true);
		const langToUse =
			client.settings.get(interaction.guild!.id, "lang") ??
			interaction.guild?.preferredLocale ??
			interaction.locale;
		const ul = ln(langToUse);
		await interaction.deferReply({ ephemeral: true });
		const ext = csvFile.name.split(".").pop()?.toLowerCase() ?? "";
		if (!ext || ext !== "csv") {
			return reply(interaction, { content: ul("import.errors.invalid_file", { ext }) });
		}
		/** download the file using paparse */
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, { content: ul("error.noTemplate") });
		}
		const { members, errors } = await parseCSV(
			csvFile.url,
			guildTemplate,
			interaction,
			client.settings.has(interaction.guild!.id, "privateChannel"),
			langToUse
		);
		const defaultChannel = client.settings.get(interaction.guild!.id, "managerId");
		const privateChannel = client.settings.get(interaction.guild!.id, "privateChannel");
		if (!defaultChannel) {
			return reply(interaction, { content: ul("error.noDefaultChannel") });
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
					char.avatar ?? member.avatarURL() ?? member.defaultAvatarURL,
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
						name: name.capitalize(),
						value: fieldValue,
						inline: true,
					});
				}
				for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
					diceEmbed!.addFields({
						name: name.capitalize(),
						value: `\`${dice}\``,
						inline: true,
					});
				}

				for (const [name, dice] of Object.entries(char.damage ?? {})) {
					if (!diceEmbed) diceEmbed = createDiceEmbed(ul);
					diceEmbed!.addFields({
						name: name.capitalize(),
						value: `\`${dice}\``,
						inline: true,
					});
				}

				let templateEmbed: Djs.EmbedBuilder | undefined = undefined;
				if (guildTemplate.diceType || guildTemplate.critical) {
					templateEmbed = new Djs.EmbedBuilder()
						.setTitle(ul("embed.template"))
						.setColor("DarkerGrey");
					templateEmbed.addFields({
						name: ul("common.dice").capitalize(),
						value: `\`${guildTemplate.diceType}\``,
						inline: true,
					});
					if (guildTemplate.critical?.success) {
						templateEmbed.addFields({
							name: ul("roll.critical.success"),
							value: `\`${guildTemplate.critical.success}\``,
							inline: true,
						});
					}
					if (guildTemplate.critical?.failure) {
						templateEmbed.addFields({
							name: ul("roll.critical.failure"),
							value: `\`${guildTemplate.critical.failure}\``,
							inline: true,
						});
					}
				}
				const allEmbeds = createEmbedsList(
					userDataEmbed,
					statsEmbed,
					diceEmbed,
					templateEmbed
				);
				await repostInThread(
					allEmbeds,
					interaction,
					char,
					member.id,
					ul,
					{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
					client.settings,
					char.channel ??
						(char.private && privateChannel ? privateChannel : defaultChannel)
				);
				addAutoRole(interaction, member.id, !!diceEmbed, !!statsEmbed, client.settings);
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
		.setDMPermission(false)
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("csv_generation.name"))
		.setDescription(t("csv_generation.description"))
		.setDescriptionLocalizations(cmdLn("csv_generation.description")),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const lang =
			client.settings.get(interaction.guild.id, "lang") ??
			interaction.guild.preferredLocale ??
			interaction.locale;
		const ul = ln(lang);
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, { content: ul("error.noTemplate") });
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
