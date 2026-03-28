// ---------------------------------------------------------------------------
// Types, interfaces et constantes partagées pour les routes /guilds
// ---------------------------------------------------------------------------

export interface EmbedField {
	name: string;
	value: string;
}

export interface RawEmbed {
	title?: string;
	thumbnail?: { url: string };
	fields?: readonly EmbedField[];
}

export interface ApiCharacter {
	charName: string | null;
	messageId: string;
	channelId: string;
	discordLink: string;
	canLink: boolean;
	isPrivate: boolean;
	avatar: string | null;
	stats: EmbedField[] | null;
	damage: EmbedField[] | null;
	/** Only present in admin server-wide character list */
	userId?: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const DISCORD_API = "https://discord.com/api/v10";

/** Marqueurs identifiant un embed "fiche utilisateur" */
export const USER_EMBED_MARKERS = [
	"⌈⌋",
	"registration",
	"enregistrement",
	"registered player",
	"joueur enregistré",
];

export const STATS_TITLES = ["statistic", "statistique", "statistics", "statistiques"];

/** Discord snowflake : chaîne numérique de 17 à 20 chiffres */
export const SNOWFLAKE_RE = /^\d{17,20}$/;

// ---------------------------------------------------------------------------
// Caches module-level (singleton par processus)
// ---------------------------------------------------------------------------

/** Cache des fiches personnage : clé = `${guildId}:${userId}`, TTL = 5 min */
export const CHAR_CACHE_TTL = 5 * 60 * 1000;
export const charCache = new Map<string, { data: ApiCharacter[]; ts: number }>();

/** Cache des permissions : clé = `${userId}:${guildId}`, TTL = 5 min */
export const PERM_CACHE_TTL = 5 * 60 * 1000;
export const permCache = new Map<string, { result: boolean; expiresAt: number }>();
