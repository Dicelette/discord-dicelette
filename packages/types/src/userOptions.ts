import { validateCustomFormula } from "@dicelette/core";

type OptionBase = {
	/** Rendered automatically in this dashboard section. Options without it are handled by hand. */
	section?: "general";
};

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
		validate: (value) => {
			const result = validateCustomFormula(value);
			return result.ok ? null : result.error;
		},
	},
	ignoreNotfound: { kind: "string" },
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
