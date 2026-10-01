import type { EClient } from "@dicelette/client";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import {
	getUserOption,
	parseUserOption,
	SLASH_USER_OPTION_KEYS,
	storeUserOption,
	USER_OPTIONS,
	type UserOptionDef,
} from "@dicelette/types";
import * as Djs from "discord.js";
import { reply } from "messages";

type Tr = (key: string, options?: Record<string, unknown>) => string;

const OPTIONS_KEY = "userSettings.options";
const tr = t as Tr;
const keyOf = (key: string, suffix: string) => `${OPTIONS_KEY}.${key}.${suffix}`;

export const hasGeneratedOptions = SLASH_USER_OPTION_KEYS.length > 0;

export function userOptionsGroup(defs: Record<string, UserOptionDef> = USER_OPTIONS) {
	return (group: Djs.SlashCommandSubcommandGroupBuilder) => {
		group.setNames(`${OPTIONS_KEY}.title`).setDescriptions(`${OPTIONS_KEY}.description`);
		for (const [key, def] of Object.entries(defs).filter(([, d]) => d.slash))
			group.addSubcommand((sub) => {
				sub.setNames(keyOf(key, "name")).setDescriptions(keyOf(key, "description"));
				const addValue = <
					T extends Djs.SlashCommandStringOption | Djs.SlashCommandBooleanOption,
				>(
					option: T
				): T => {
					option
						.setNames(`${OPTIONS_KEY}.value.title`)
						.setDescriptions(`${OPTIONS_KEY}.value.description`)
						.setRequired(false);
					return option;
				};
				return def.kind === "boolean"
					? sub.addBooleanOption(addValue)
					: sub.addStringOption(addValue);
			});
		return group.addSubcommand((sub) =>
			sub
				.setNames(`${OPTIONS_KEY}.list.title`)
				.setDescriptions(`${OPTIONS_KEY}.list.description`)
		);
	};
}

export async function userOptionsExecute(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const { ul } = getLangAndConfig(client, interaction);
	const ulr = ul as unknown as Tr;
	const subcommand = interaction.options.getSubcommand(true);
	const guildId = interaction.guild!.id;
	const userId = interaction.user.id;

	if (subcommand === tr(`${OPTIONS_KEY}.list.title`)) {
		const stored = client.userSettings.get(guildId, userId);
		const lines = SLASH_USER_OPTION_KEYS.map((key) => {
			const value = stored?.[key];
			return `- __${ulr(keyOf(key, "name"))}__ : \`${value ?? ul("common.noSet")}\``;
		});
		return await reply(interaction, {
			content: lines.join("\n"),
			flags: Djs.MessageFlags.Ephemeral,
		});
	}

	const key = SLASH_USER_OPTION_KEYS.find((k) => tr(keyOf(k, "name")) === subcommand);
	if (!key) return;
	const name = ulr(keyOf(key, "name"));
	const raw =
		getUserOption(key).kind === "boolean"
			? interaction.options.getBoolean(tr(`${OPTIONS_KEY}.value.title`))
			: (interaction.options.getString(tr(`${OPTIONS_KEY}.value.title`)) ?? "");
	const parsed =
		raw === null ? { ok: true as const, value: undefined } : parseUserOption(key, raw);

	if (!parsed.ok)
		return await reply(interaction, {
			content: ulr(`${OPTIONS_KEY}.invalid`, { error: parsed.error, name }),
			flags: Djs.MessageFlags.Ephemeral,
		});

	storeUserOption(client.userSettings, guildId, userId, key, parsed.value);
	await reply(interaction, {
		content:
			parsed.value === undefined
				? ulr(`${OPTIONS_KEY}.reset`, { name })
				: ulr(`${OPTIONS_KEY}.saved`, { name, value: String(parsed.value) }),
		flags: Djs.MessageFlags.Ephemeral,
	});
}
