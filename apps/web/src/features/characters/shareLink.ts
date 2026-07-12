const DEFAULT_CHAR_SLUG = "default";

/** Builds the shareable single-character URL, using "default" for unnamed characters. */
export function buildCharShareHref(
	guildId: string,
	userId: string,
	charName: string | null
): string {
	return `/char/${guildId}/${userId}/${encodeURIComponent(charName ?? DEFAULT_CHAR_SLUG)}`;
}

/** Whether a character matches a URL slug produced by `buildCharShareHref`. */
export function matchesCharSlug(charName: string | null, slug: string): boolean {
	const decoded = decodeURIComponent(slug);
	return decoded === DEFAULT_CHAR_SLUG ? charName === null : charName === decoded;
}
