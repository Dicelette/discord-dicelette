import type { USER_OPTIONS } from "./options";

type OptionBase = {
	/** Rendered automatically in this dashboard section. Options without it are handled by hand. */
	section?: "general";
	/**
	 * Generates a slash group. `true` creates `/settings <name> configure|display` from
	 * `userSettings.<key>.description` (required), plus optional `.group` (else the
	 * snake_cased key) and `.value` (else the generic description). A partial spec overrides
	 * the keys to keep an existing command or to extend a handwritten group.
	 */
	slash?: true | SlashOverrides;
	context?: "male" | "female";
};

type StringOption = OptionBase & {
	kind: "string";
	/** Returns an error message, or `null` when the value is valid. */
	validate?: (value: string) => string | null;
	helperLink?: { href: string; text: string };
	format?: (value: string) => string;
};

type BooleanOption = OptionBase & {
	kind: "boolean";
};

export type UserOptionDef = StringOption | BooleanOption;

export type UserOptionSection = NonNullable<OptionBase["section"]>;

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

export type SlashOverrides = Partial<Omit<SlashSpec, "messages" | "display">> & {
	messages?: Partial<SlashSpec["messages"]>;
	/** Partial keys are merged over the defaults; `false` removes the `display` subcommand. */
	display?: false | Partial<NonNullable<SlashSpec["display"]>>;
};

type OptionValueByKind = { string: string; boolean: boolean };

export type UserOptionKey = keyof typeof USER_OPTIONS;

export type UserOptionValues = {
	[K in UserOptionKey]: OptionValueByKind[(typeof USER_OPTIONS)[K]["kind"]];
};

export type ParsedUserOption =
	| { ok: true; value: string | boolean | undefined }
	| { ok: false; error: string };

export type UserOptionStore = {
	set(guildId: string, value: string | boolean, path: string): unknown;
	has(guildId: string, path: string): boolean;
	delete(guildId: string, path: string): unknown;
};
