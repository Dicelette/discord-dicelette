// ---------------------------------------------------------------------------
// Dynamic Open Graph / Twitter Card metadata for shareable public links.
//
// The dashboard is a client-rendered SPA: link-preview crawlers (Discord,
// Twitter, Slack, ...) never execute its JS, so they only ever see the
// static `index.html`. To get a real "summary card" on a shared karma or
// character link, the server has to patch that HTML's <title>/<meta> tags
// per-request, before it's sent — this module does exactly that, for the
// small set of public share routes, and falls through to the plain SPA
// shell for everything else (including when a lookup fails).
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { getPublicCharacterList } from "./guilds/characters";
import { getPublicKarmaEntry, getPublicLeaderboardUsers } from "./guilds/karma";
import type { DashboardDeps } from "./types";
import { isValidSnowflake } from "./utils";

interface PageMeta {
	title: string;
	description: string;
	image: string | null;
}

type Lang = "en" | "fr";

const STRINGS: Record<
	Lang,
	{
		karmaLeaderboardTitle: (guildName: string) => string;
		karmaLeaderboardDesc: (count: number) => string;
		karmaProfileTitle: (name: string) => string;
		karmaProfileDesc: (total: number, guildName: string) => string;
		charactersTitle: (ownerName: string) => string;
		charactersDesc: (count: number, guildName: string) => string;
		characterDesc: (ownerName: string, guildName: string) => string;
		unnamedCharacter: string;
	}
> = {
	en: {
		karmaLeaderboardTitle: (name) => `Karma leaderboard — ${name}`,
		karmaLeaderboardDesc: (n) => `${n} player${n === 1 ? "" : "s"} tracked.`,
		karmaProfileTitle: (name) => `${name} — Karma`,
		karmaProfileDesc: (total, guild) =>
			`${total} roll${total === 1 ? "" : "s"} on ${guild}.`,
		charactersTitle: (name) => `${name}'s characters`,
		charactersDesc: (n, guild) => `${n} character${n === 1 ? "" : "s"} on ${guild}.`,
		characterDesc: (owner, guild) => `${owner}'s character on ${guild}.`,
		unnamedCharacter: "Unnamed character",
	},
	fr: {
		karmaLeaderboardTitle: (name) => `Classement karma — ${name}`,
		karmaLeaderboardDesc: (n) =>
			`${n} joueur${n === 1 ? "" : "s"} suivi${n === 1 ? "" : "s"}.`,
		karmaProfileTitle: (name) => `${name} — Karma`,
		karmaProfileDesc: (total, guild) =>
			`${total} jet${total === 1 ? "" : "s"} sur ${guild}.`,
		charactersTitle: (name) => `Personnages de ${name}`,
		charactersDesc: (n, guild) => `${n} personnage${n === 1 ? "" : "s"} sur ${guild}.`,
		characterDesc: (owner, guild) => `Personnage de ${owner} sur ${guild}.`,
		unnamedCharacter: "Personnage sans nom",
	},
};

function pickLang(lang: string | undefined): Lang {
	return lang?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function guildIconUrl(guildId: string, icon: string | null): string | null {
	return icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png` : null;
}

/**
 * Mirrors `matchesCharSlug` in apps/web/src/features/characters/shareLink.ts
 * (client-only module, not reachable from the server bundle) — kept in sync
 * by hand since it's a few stable lines, not worth sharing across bundles.
 */
function matchesCharSlug(charName: string | null, slug: string): boolean {
	const decoded = decodeURIComponent(slug);
	return decoded === "default" ? charName === null : charName === decoded;
}

async function resolveKarmaLeaderboardMeta(
	guildId: string,
	deps: DashboardDeps,
	lang: Lang
): Promise<PageMeta | null> {
	const guild = deps.botGuilds.get(guildId);
	if (!guild) return null;
	const users = await getPublicLeaderboardUsers(guildId, deps);
	return {
		title: STRINGS[lang].karmaLeaderboardTitle(guild.name),
		description: STRINGS[lang].karmaLeaderboardDesc(users.length),
		image: guildIconUrl(guildId, guild.icon),
	};
}

async function resolveKarmaProfileMeta(
	guildId: string,
	userId: string,
	deps: DashboardDeps,
	lang: Lang
): Promise<PageMeta | null> {
	if (!isValidSnowflake(userId)) return null;
	const guild = deps.botGuilds.get(guildId);
	if (!guild) return null;
	const entry = await getPublicKarmaEntry(guildId, userId, deps);
	if (!entry) return null;
	const name = entry.displayName ?? entry.username ?? "?";
	return {
		title: STRINGS[lang].karmaProfileTitle(name),
		description: STRINGS[lang].karmaProfileDesc(entry.total ?? 0, guild.name),
		image: entry.avatar ?? guildIconUrl(guildId, guild.icon),
	};
}

async function resolveCharactersMeta(
	guildId: string,
	userId: string,
	deps: DashboardDeps,
	lang: Lang
): Promise<PageMeta | null> {
	if (!isValidSnowflake(userId)) return null;
	const guild = deps.botGuilds.get(guildId);
	if (!guild || !deps.settings.get(guildId)) return null;
	const [characters, ownerName] = await Promise.all([
		getPublicCharacterList(guildId, userId, deps),
		guild.fetchMemberName(userId).catch(() => null),
	]);
	const name = ownerName?.displayName;
	if (!name) return null;
	return {
		title: STRINGS[lang].charactersTitle(name),
		description: STRINGS[lang].charactersDesc(characters.length, guild.name),
		image:
			characters.find((c) => c.avatar)?.avatar ??
			(await guild.fetchMemberAvatar(userId).catch(() => null)) ??
			guildIconUrl(guildId, guild.icon),
	};
}

async function resolveCharacterDetailMeta(
	guildId: string,
	userId: string,
	charSlug: string,
	deps: DashboardDeps,
	lang: Lang
): Promise<PageMeta | null> {
	if (!isValidSnowflake(userId)) return null;
	const guild = deps.botGuilds.get(guildId);
	if (!guild || !deps.settings.get(guildId)) return null;
	const [characters, ownerName] = await Promise.all([
		getPublicCharacterList(guildId, userId, deps),
		guild.fetchMemberName(userId).catch(() => null),
	]);
	const char = characters.find((c) => matchesCharSlug(c.charName, charSlug));
	if (!char || !ownerName?.displayName) return null;
	return {
		title: char.charName ?? STRINGS[lang].unnamedCharacter,
		description: STRINGS[lang].characterDesc(ownerName.displayName, guild.name),
		image: char.avatar ?? guildIconUrl(guildId, guild.icon),
	};
}

export type ShareRouteKind =
	| "karma-leaderboard"
	| "karma-profile"
	| "characters"
	| "character";

async function resolveMeta(
	kind: ShareRouteKind,
	req: Request,
	deps: DashboardDeps
): Promise<PageMeta | null> {
	const { guildId, userId, charName } = req.params as Record<string, string | undefined>;
	if (!guildId || !isValidSnowflake(guildId)) return null;
	const lang = pickLang(deps.settings.get(guildId, "lang"));

	switch (kind) {
		case "karma-leaderboard":
			return resolveKarmaLeaderboardMeta(guildId, deps, lang);
		case "karma-profile":
			return userId ? resolveKarmaProfileMeta(guildId, userId, deps, lang) : null;
		case "characters":
			return userId ? resolveCharactersMeta(guildId, userId, deps, lang) : null;
		case "character":
			return userId && charName
				? resolveCharacterDetailMeta(guildId, userId, charName, deps, lang)
				: null;
	}
}

function setMetaContent(
	html: string,
	selectorAttr: string,
	selectorValue: string,
	newValue: string
): string {
	const re = new RegExp(
		`(<meta[^>]*${selectorAttr}="${selectorValue}"[^>]*content=")[^"]*(")`,
		"i"
	);
	return html.replace(re, (_m, pre: string, post: string) => `${pre}${newValue}${post}`);
}

function injectMeta(
	html: string,
	meta: PageMeta,
	pageUrl: string,
	fallbackImage: string
): string {
	const title = escapeHtml(meta.title);
	const description = escapeHtml(meta.description);
	const image = escapeHtml(meta.image ?? fallbackImage);
	const url = escapeHtml(pageUrl);

	let out = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
	out = setMetaContent(out, "name", "description", description);
	out = setMetaContent(out, "itemprop", "name", title);
	out = setMetaContent(out, "itemprop", "description", description);
	out = setMetaContent(out, "itemprop", "image", image);
	out = setMetaContent(out, "property", "og:title", title);
	out = setMetaContent(out, "property", "og:description", description);
	out = setMetaContent(out, "property", "og:image", image);
	out = setMetaContent(out, "property", "og:url", url);
	out = setMetaContent(out, "name", "twitter:title", title);
	out = setMetaContent(out, "name", "twitter:description", description);
	out = setMetaContent(out, "name", "twitter:image", image);
	return out;
}

/**
 * Express handler for one public share route — patches `index.html`'s meta
 * tags with per-guild/per-character data when it can, and otherwise calls
 * `next()` so the generic SPA catch-all serves the plain shell.
 */
export function createShareMetaHandler(
	kind: ShareRouteKind,
	deps: DashboardDeps,
	indexHtmlPath: string,
	frontendUrl: string
) {
	let template: string | null = null;
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const meta = await resolveMeta(kind, req, deps);
			if (!meta) {
				next();
				return;
			}
			template ??= readFileSync(indexHtmlPath, "utf-8");
			const pageUrl = `${frontendUrl}${req.originalUrl}`;
			res
				.type("html")
				.send(injectMeta(template, meta, pageUrl, `${frontendUrl}/logo.png`));
		} catch {
			next();
		}
	};
}
