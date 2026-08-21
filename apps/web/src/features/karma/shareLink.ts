/** Builds the shareable karma URL for a single user, mirroring the character share links. */
export function buildKarmaShareHref(guildId: string, userId: string): string {
	return `/karma/${guildId}/${userId}`;
}
