import type { EClient } from "@dicelette/bot-core";
import { macroOptions } from "@dicelette/bot-helpers";
import { t } from "@dicelette/localization";
import { logger, uniformizeRecords } from "@dicelette/utils";
import { getFirstChar, getTemplateByInteraction, getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import { reply, replyEphemeralError } from "messages";
import {
	buildDamageAutocompleteChoices,
	getLangAndConfig,
	isSerializedNameEquals,
	rollMacro,
} from "utils";
import "discord_ext";

export default {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const choices = await buildDamageAutocompleteChoices(
			interaction,
			client,
			interaction.options.getFocused(true),
			interaction.options as Djs.CommandInteractionOptionResolver
		);
		await interaction.respond(choices);
	},
	data: (macroOptions(new Djs.SlashCommandBuilder()) as Djs.SlashCommandBuilder)
		.setNames("common.macro")
		.setDescriptions("rAtq.description")
		.setDefaultMemberPermissions(0),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = client.settings.get(interaction.guild.id, `user.${interaction.user.id}`);
		const { ul } = getLangAndConfig(client, interaction);
		if (!user && !db.templateID?.damageName?.length) {
			await replyEphemeralError(interaction, t("error.user.data"), ul);
			return;
		}
		let charOptions = options.getString(t("common.character")) ?? undefined;
		const charName = charOptions?.normalize();
		try {
			let userStatistique = (
				await getUserFromInteraction(client, interaction.user.id, interaction, charName, {
					skipNotFound: true,
				})
			)?.userData;
			const selectedCharByQueries = isSerializedNameEquals(userStatistique, charName);
			if (charOptions && !selectedCharByQueries) {
				const text = ul("error.user.charName", { charName: charOptions.capitalize() });
				await replyEphemeralError(interaction, text, ul);
				return;
			}
			charOptions = userStatistique?.userName ? userStatistique.userName : undefined;
			if (!userStatistique && !charName) {
				const char = await getFirstChar(client, interaction, ul, true);
				userStatistique = char?.userStatistique?.userData;
				charOptions = char?.optionChar ?? undefined;
			}
			if (!db.templateID.damageName) {
				if (!userStatistique) {
					await replyEphemeralError(interaction, ul("error.user.youRegistered"), ul);
					return;
				}
				if (!userStatistique.damage) {
					await replyEphemeralError(interaction, ul("error.damage.empty"), ul);
					return;
				}
			} else if (!userStatistique || !userStatistique.damage) {
				//allow global damage with constructing a new userStatistique with only the damageName and their value
				//get the damageName from the global template
				const template = await getTemplateByInteraction(interaction, client);
				if (!template) {
					const text = ul("error.template.notFound", {
						guildId: interaction.guild.name,
					});
					await replyEphemeralError(interaction, text, ul);
					return;
				}
				const damage = template.damage
					? (uniformizeRecords(template.damage) as Record<string, string>)
					: undefined;
				logger.trace("The template use:", damage);

				//create the userStatistique with the value got from the template & the commands
				userStatistique = {
					damage,
					isFromTemplate: true,
					template: {
						critical: template.critical,
						customCritical: template.customCritical,
						diceType: template.diceType,
					},
					userName: charName,
				};
			}
			return await rollMacro(
				interaction,
				client,
				userStatistique,
				options,
				ul,
				charOptions
			);
		} catch (e) {
			logger.fatal(e);
			await reply(interaction, {
				content: t("error.generic.e", { e: e as Error }),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
	},
};
