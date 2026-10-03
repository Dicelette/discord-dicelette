import { USER_OPTIONS } from "./options";
import type {
	ParsedUserOption,
	UserOptionDef,
	UserOptionKey,
	UserOptionSection,
	UserOptionStore,
} from "./types";

export function getUserOption(key: UserOptionKey): UserOptionDef {
	return USER_OPTIONS[key];
}

export const USER_OPTION_KEYS = Object.keys(USER_OPTIONS) as UserOptionKey[];

export const SLASH_USER_OPTION_KEYS = USER_OPTION_KEYS.filter(
	(key) => getUserOption(key).slash
);

export function getUserOptionsBySection(section: UserOptionSection) {
	return USER_OPTION_KEYS.filter((key) => getUserOption(key).section === section);
}

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

export function storeUserOption(
	store: UserOptionStore,
	guildId: string,
	userId: string,
	key: UserOptionKey,
	value: string | boolean | undefined
) {
	const path = `${userId}.${key}`;
	if (value !== undefined) store.set(guildId, value, path);
	// Enmap throws on a path delete when the guild has no entry yet.
	else if (store.has(guildId, path)) store.delete(guildId, path);
}
