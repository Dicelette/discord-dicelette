import { t } from "@dicelette/localization";
import { filterStatsInDamage } from "@dicelette/parse_result";
import { filterChoices, logger, uniformizeRecords } from "@dicelette/utils";
import type { EClient } from "client";
import { getFirstChar, getTemplateByInteraction, getUserFromInteraction } from "database";
import * as Djs from "discord.js";
import { embedError, reply } from "messages";
import { getLangAndConfig, isSerializedNameEquals, macroOptions, rollMacro } from "utils";
import "discord_ext";
import { capitalizeBetweenPunct } from "@dicelette/utils";

export default {
	async autocomplete(interaction: Djs.AutocompleteInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !db.templateID) return;
		const user = client.settings.get(
			interaction.guild!.id,
			`user.${interaction.user.id}`
		);
		if (!user && !db.templateID.damageName) return;
		let choices: string[] = [];
		if (focused.name === t("common.name")) {
			const char = options.getString(t("common.character"));

			if (char && user) {
				const values = user.find((data) => {
					return data.charName?.subText(char);
				});
				if (values?.damageName) choices = values.damageName;
			} else if (user) {
				for (const [, value] of Object.entries(user)) {
					if (value.damageName) choices = choices.concat(value.damageName);
				}
			}
			if (
				db.templateID.damageName &&
				db.templateID.damageName.length > 0 &&
				choices.length === 0
			) {
				const template = await getTemplateByInteraction(interaction, client);
				if (!template) choices = choices.concat(db.templateID.damageName);
				else if (template.damage) {
					choices = choices.concat(
						filterStatsInDamage(template.damage, db.templateID.damageName)
					);
				}
			}
		} else if (focused.name === t("common.character") && user) {
			//if dice is set, get all characters that have this dice
			const skill = options.getString(t("common.name"));
			const allCharactersFromUser = user
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
			if (skill) {
				if (
					db.templateID.damageName
						?.map((x) => x.standardize())
						.includes(skill.standardize())
				) {
					choices = allCharactersFromUser;
				} else {
					const values = user.filter((data) => {
						if (data.damageName)
							return data.damageName
								.map((data) => data.standardize())
								.includes(skill.standardize());
						return false;
					});
					choices = values
						.map((data) => data.charName ?? t("common.default"))
						.filter((data) => data.length > 0);
				}
			} else {
				//get user characters
				choices = allCharactersFromUser;
			}
		}
		if (!choices || choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({
				name: capitalizeBetweenPunct(result.capitalize()),
				value: result,
			}))
		);
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
			await reply(interaction, {
				embeds: [embedError(t("error.user.data"), ul)],
				flags: Djs.MessageFlags.Ephemeral,
			});
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
				await reply(interaction, {
					embeds: [
						embedError(
							ul("error.user.charName", { charName: charOptions.capitalize() }),
							ul
						),
					],
					flags: Djs.MessageFlags.Ephemeral,
				});
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
					await reply(interaction, {
						embeds: [embedError(ul("error.user.youRegistered"), ul)],
						flags: Djs.MessageFlags.Ephemeral,
					});
					return;
				}
				if (!userStatistique.damage) {
					await reply(interaction, {
						embeds: [embedError(ul("error.damage.empty"), ul)],
						flags: Djs.MessageFlags.Ephemeral,
					});
					return;
				}
			} else if (!userStatistique || !userStatistique.damage) {
				//allow global damage with constructing a new userStatistique with only the damageName and their value
				//get the damageName from the global template
				const template = await getTemplateByInteraction(interaction, client);
				if (!template) {
					await reply(interaction, {
						embeds: [
							embedError(
								ul("error.template.notFound", {
									guildId: interaction.guild.name,
								}),
								ul
							),
						],
						flags: Djs.MessageFlags.Ephemeral,
					});
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
