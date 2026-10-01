import type { EClient } from "@dicelette/client";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import {
	DEFAULT_SLASH_GROUP,
	parseUserOption,
	storeUserOption,
	USER_OPTIONS,
	type UserOptionKey,
} from "@dicelette/types";
import * as Djs from "discord.js";
import { reply } from "messages";
import { LIST_TITLE, slashEntries } from "./options";

type Tr = (key: string, options?: Record<string, unknown>) => string;

const tr = t as Tr;

/** Returns `false` when the interaction does not target a generated subcommand. */
export async function userOptionsExecute(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const group = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand(true);
	const entries = slashEntries(USER_OPTIONS).filter((e) => tr(e.spec.group) === group);
	const { ul } = getLangAndConfig(client, interaction);
	const ulr = ul as unknown as Tr;
	const guildId = interaction.guild!.id;
	const userId = interaction.user.id;
	const stored = client.userSettings.get(guildId, userId);
	const ephemeral = Djs.MessageFlags.Ephemeral;

	if (group === tr(DEFAULT_SLASH_GROUP) && subcommand === tr(LIST_TITLE)) {
		const lines = entries.map(
			({ key, spec }) =>
				`- __${ulr(spec.subcommand)}__ : \`${stored?.[key as UserOptionKey] ?? ul("common.noSet")}\``
		);
		await reply(interaction, { content: lines.join("\n"), flags: ephemeral });
		return true;
	}

	const displayed = entries.find(
		(e) => e.spec.display && tr(e.spec.display.subcommand) === subcommand
	);
	if (displayed?.spec.display) {
		const { display, valueParam } = displayed.spec;
		const value = stored?.[displayed.key as UserOptionKey];
		await reply(interaction, {
			content:
				value === undefined
					? ulr(display!.empty)
					: ulr(display!.reply, { [valueParam]: value, value }),
		});
		return true;
	}

	const entry = entries.find((e) => tr(e.spec.subcommand) === subcommand);
	if (!entry) return false;
	const { def, spec } = entry;
	const key = entry.key as UserOptionKey;
	const name = ulr(spec.subcommand);
	const optionName = tr(spec.valueName);
	const raw =
		def.kind === "boolean"
			? interaction.options.getBoolean(optionName)
			: (interaction.options.getString(optionName) ?? "");
	const parsed =
		raw === null ? { ok: true as const, value: undefined } : parseUserOption(key, raw);

	if (!parsed.ok) {
		await reply(interaction, {
			content: ulr(spec.messages.invalid, {
				[spec.valueParam]: raw,
				error: parsed.error,
				name,
			}),
			flags: ephemeral,
		});
		return true;
	}

	const existed = stored?.[key] !== undefined;
	storeUserOption(client.userSettings, guildId, userId, key, parsed.value);
	const params = { [spec.valueParam]: parsed.value, name, value: String(parsed.value) };
	const message =
		parsed.value !== undefined
			? spec.messages.saved
			: !existed && spec.messages.notFound
				? spec.messages.notFound
				: spec.messages.reset;
	await reply(interaction, { content: ulr(message, params), flags: ephemeral });
	return true;
}
