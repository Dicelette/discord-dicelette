import type { EClient } from "@dicelette/client";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import {
	parseUserOption,
	storeUserOption,
	type Translation,
	USER_OPTIONS,
	type UserOptionDef,
	type UserOptionKey,
} from "@dicelette/types";
import * as Djs from "discord.js";
import { reply } from "messages";
import { displayedCommandName, groupName, slashEntries } from "./options";

/**
 * Returns `false` when the interaction does not target a generated subcommand.
 * Discord always sends the default (English) names, so they are matched with `t`, never with `ul`.
 */
export async function userOptionsExecute(
	client: EClient,
	interaction: Djs.ChatInputCommandInteraction
) {
	const group = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand(true);
	const { ul } = getLangAndConfig(client, interaction);
	const entries = slashEntries(USER_OPTIONS).filter(
		(e) => groupName(e.key, e.spec, t) === group
	);
	const guildId = interaction.guild!.id;
	const userId = interaction.user.id;
	const stored = client.userSettings.get(guildId, userId);
	const ephemeral = Djs.MessageFlags.Ephemeral;

	const displayed = entries.find(
		(e) => e.spec.display && t(e.spec.display.subcommand) === subcommand
	);

	if (displayed?.spec.display) {
		const { display, group: groupKey, valueParam } = displayed.spec;
		const name = displayedCommandName(displayed.key, displayed.spec, ul);
		const value = stored?.[displayed.key as UserOptionKey];
		const displayedValue = formatResult(displayed.def, value, ul);
		await reply(interaction, {
			content:
				value === undefined
					? ul(display!.empty, { name, context: displayed.def.context })
					: ul(display!.reply, {
							[valueParam]: value,
							name,
							context: displayed.def.context,
							value: displayedValue,
						}),
		});
		return true;
	}

	const entry = entries.find((e) => t(e.spec.subcommand) === subcommand);
	if (!entry) return false;
	const { def, spec } = entry;
	const key = entry.key as UserOptionKey;
	const name = displayedCommandName(entry.key, spec, ul);
	const optionName = t(spec.valueName);
	const raw =
		def.kind === "boolean"
			? interaction.options.getBoolean(optionName)
			: (interaction.options.getString(optionName) ?? "");
	const parsed =
		raw === null ? { ok: true as const, value: undefined } : parseUserOption(key, raw);

	if (!parsed.ok) {
		await reply(interaction, {
			content: ul(spec.messages.invalid, {
				[spec.valueParam]: raw,
				error: parsed.error,
				name,
				context: entry.def.context,
			}),
			flags: ephemeral,
		});
		return true;
	}

	const existed = stored?.[key] !== undefined;
	storeUserOption(client.userSettings, guildId, userId, key, parsed.value);
	const params = {
		[spec.valueParam]: parsed.value,
		name,
		value: String(parsed.value),
		context: entry.def.context,
	};
	params.value = formatResult(entry.def, parsed.value, ul);

	const message =
		parsed.value !== undefined
			? savedMessage(entry.def, parsed.value)
			: !existed && spec.messages.notFound
				? spec.messages.notFound
				: spec.messages.reset;
	await reply(interaction, { content: ul(message, params), flags: ephemeral });
	return true;
}

function formatResult(
	def: UserOptionDef,
	value: string | boolean | undefined,
	ul: Translation
) {
	if (def.kind === "string" && def.format) return def.format(value as string);
	if (def.kind === "boolean") {
		if (!value) return ul("common.no");
		return ul("common.yes");
	}
}

function savedMessage(def: UserOptionDef, value?: unknown) {
	if (def.kind === "boolean") {
		if (!value) return "userSettings.disabled";
		return "userSettings.enabled";
	}
	return "userSettings.saved";
}
