import { validateCustomFormula } from "@dicelette/core";

type OptionBase = {
	/** Rendered automatically in this dashboard section. Options without it are handled by hand. */
	section?: "general";
	/**
	 * Generates a slash subcommand. `true` uses `/user_config options <name>` and the
	 * `userSettings.options.*` keys; a partial spec overrides them to keep an existing command.
	 */
	slash?: true | SlashOverrides;
};

/** i18n keys describing a generated subcommand. */
export type SlashSpec = {
	group: string;
	groupDescription: string;
	subcommand: string;
	description: string;
	valueName: string;
	valueDescription: string;
	/** Interpolation name of the value in the messages. */
	valueParam: string;
	messages: { saved: string; reset: string; invalid: string; notFound?: string };
	/** Adds a subcommand that displays the stored value. */
	display?: { subcommand: string; description: string; reply: string; empty: string };
};

type SlashOverrides = Partial<Omit<SlashSpec, "messages">> & {
	messages?: Partial<SlashSpec["messages"]>;
};

export const DEFAULT_SLASH_GROUP = "userSettings.options.title";

export function resolveSlash(key: string, slash: true | SlashOverrides): SlashSpec {
	const base = "userSettings.options";
	const spec = slash === true ? {} : slash;
	return {
		description: `${base}.${key}.description`,
		group: DEFAULT_SLASH_GROUP,
		groupDescription: `${base}.description`,
		subcommand: `${base}.${key}.name`,
		valueDescription: `${base}.value.description`,
		valueName: `${base}.value.title`,
		valueParam: "value",
		...spec,
		messages: {
			invalid: `${base}.invalid`,
			reset: `${base}.reset`,
			saved: `${base}.saved`,
			...spec.messages,
		},
	};
}

type StringOption = OptionBase & {
	kind: "string";
	/** Returns an error message, or `null` when the value is valid. */
	validate?: (value: string) => string | null;
	helperLink?: { href: string; text: string };
};

type BooleanOption = OptionBase & { kind: "boolean" };

export type UserOptionDef = StringOption | BooleanOption;

/**
 * Scalar per-user options. Adding an entry types `UserSettingsData`, validates the
 * dashboard PATCH and renders the field. Labels live in `userConfig.options.<key>.label|helper`.
 */
export const USER_OPTIONS = {
	customFormula: {
		helperLink: { href: "https://mathjs.org", text: "Mathjs" },
		kind: "string",
		section: "general",
		slash: {
			display: {
				description: "userSettings.formula.display.description",
				empty: "userSettings.formula.noDisplay",
				reply: "userSettings.formula.display.reply",
				subcommand: "display.title",
			},
			group: "userSettings.formula.title",
			groupDescription: "userSettings.formula.description",
			description: "userSettings.formula.set.description",
			messages: {
				invalid: "userSettings.formula.invalid",
				notFound: "userSettings.formula.notFound",
				reset: "userSettings.formula.reset",
				saved: "userSettings.formula.saved",
			},
			subcommand: "userSettings.formula.set.title",
			valueDescription: "userSettings.formula.set.formula",
			valueName: "common.formula",
			valueParam: "formula",
		},
		validate: (value) => {
			const result = validateCustomFormula(value);
			return result.ok ? null : result.error;
		},
	},
	ignoreNotfound: {
		kind: "string",
		slash: {
			description: "userSettings.attributes.replaceUnknown.description",
			group: "userSettings.attributes.title",
			groupDescription: "userSettings.attributes.description",
			messages: {
				reset: "userSettings.attributes.replaceUnknown.reset",
				saved: "userSettings.attributes.replaceUnknown.set",
			},
			subcommand: "userSettings.attributes.replaceUnknown.title",
			valueDescription: "userSettings.attributes.replaceUnknown.options",
			valueName: "userSettings.attributes.create.value.title",
		},
	},
} as const satisfies Record<string, UserOptionDef>;

type OptionValueByKind = { string: string; boolean: boolean };

export type UserOptionKey = keyof typeof USER_OPTIONS;

export type UserOptionValues = {
	[K in UserOptionKey]: OptionValueByKind[(typeof USER_OPTIONS)[K]["kind"]];
};

export function getUserOption(key: UserOptionKey): UserOptionDef {
	return USER_OPTIONS[key];
}

export const USER_OPTION_KEYS = Object.keys(USER_OPTIONS) as UserOptionKey[];

export function getUserOptionsBySection(section: NonNullable<OptionBase["section"]>) {
	return USER_OPTION_KEYS.filter((key) => getUserOption(key).section === section);
}

export const SLASH_USER_OPTION_KEYS = USER_OPTION_KEYS.filter(
	(key) => getUserOption(key).slash
);

export type ParsedUserOption =
	| { ok: true; value: string | boolean | undefined }
	| { ok: false; error: string };

/** `value: undefined` means the option must be unset. */
export function parseUserOption(key: UserOptionKey, raw: unknown): ParsedUserOption {
	const def = getUserOption(key);
	if (def.kind === "boolean")
		return typeof raw === "boolean"
			? { ok: true, value: raw }
			: { error: `${key} must be a boolean`, ok: false };

	if (typeof raw !== "string") return { error: `${key} must be a string`, ok: false };
	const value = raw.trim();
	if (!value) return { ok: true, value: undefined };
	const error = def.validate?.(value);
	return error ? { error, ok: false } : { ok: true, value };
}

type UserOptionStore = {
	set(guildId: string, value: string | boolean, path: string): unknown;
	delete(guildId: string, path: string): unknown;
};

export function storeUserOption(
	store: UserOptionStore,
	guildId: string,
	userId: string,
	key: UserOptionKey,
	value: string | boolean | undefined
) {
	const path = `${userId}.${key}`;
	if (value === undefined) store.delete(guildId, path);
	else store.set(guildId, value, path);
}
