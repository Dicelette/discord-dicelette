// Pre-compiled regex patterns for better performance
export const COMPILED_PATTERNS = {
	AVATAR_URL: /^(https:\/{2})[\w\-./%]+\/[\w\-.%]+\.(jpe?g|gifv?|png|webp)$/gi,
	// Dice comparator patterns centralised (sign + comparator value)
	COMPARATOR: /(?<sign>[><=!]+)(?<comparator>(.+))/,
	COMPARATOR_SIMPLE: /([><=!]+)(.+)/,
	DISCORD_CDN: /(cdn|media)\.discordapp\.(net|com)/gi,
	PUNCTUATION_ENCLOSED: /(?<open>\p{P})(?<enclosed>.*?)(?<close>\p{P})/gu,
	QUERY_PARAMS: /\?.*$/g,
	REGEX_ESCAPE: /[.*+?^${}()|[\]\\]/g,
	VALID_EXTENSIONS: /\.?(jpe?g|gifv?|png|webp)$/gi,
	WORD_BOUNDARY: (text: string) => new RegExp(`\\b${escapeRegex(text)}\\b`, "gi"),
} as const;

export const DICE_PATTERNS = {
	BRACKET_ROLL: /\[(.*)\]/,
	BRACKETED_COMMENTS: /\[(.*)\]/,
	BRACKETED_CONTENT: /^\[(.*)\]$/,
	DETECT_DICE_MESSAGE: /([\w.]+|(\{.*\})) (.*)/i,
	DICE_VALUE: /^\S*#?d\S+|\{.*\}/i,
	GLOBAL_COMMENTS: /# ?(.*)/,
	GLOBAL_COMMENTS_GROUP: /# ?(?<comment>.*)/,
	INFO_STATS_COMMENTS: /%%(\[__.*__\])%%/,
} as const;

export const DICE_COMPILED_PATTERNS = {
	COMMENTS_REGEX: /\[([^\]]*)\]/,
	DICE_EXPRESSION: /\{exp( ?\|\| ?(?<default>\d+))?\}/gi,
	STATS_REGEX_CACHE: new Map<string, RegExp>(),
} as const;

export const REMOVER_PATTERN = {
	ASTERISK_ESCAPE: /\*/g,
	AT_MENTION_REMOVER: / @\w+/,
	CRITICAL_BLOCK: /\{\*?c[fs]:[<>=!]+.+?\}/gim,
	EXP_REMOVER: /\{exp(.*?)\}/g,
	OPPOSITION_MATCHER: /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))/,
	SIGN_REMOVER: /[><=!]+.*$/,
	STAT_COMMENTS_REMOVER: /%%.*%%/,
	VARIABLE_MATCHER: /\$([\p{L}_][\p{L}0-9_]*)/giu,
} as const;

export function verifyAvatarUrl(url: string) {
	if (url.length === 0) return false;
	// Reset lastIndex for global regex to avoid issues
	COMPILED_PATTERNS.AVATAR_URL.lastIndex = 0;
	COMPILED_PATTERNS.VALID_EXTENSIONS.lastIndex = 0;
	url.split("?")[0]; // Ignore query parameters for extension check
	if (url.match(COMPILED_PATTERNS.AVATAR_URL)) return url;
	if (url.match(COMPILED_PATTERNS.VALID_EXTENSIONS) && url.startsWith("attachment://"))
		return url;
	return false;
}

export function cleanAvatarUrl(url: string) {
	if (url.match(COMPILED_PATTERNS.DISCORD_CDN))
		return url.replace(COMPILED_PATTERNS.QUERY_PARAMS, "");
	return url;
}

export function capitalizeBetweenPunct(input: string) {
	// Regex to find sections enclosed by punctuation marks
	let remainingText = input;
	let result = input;
	for (const match of input.matchAll(COMPILED_PATTERNS.PUNCTUATION_ENCLOSED)) {
		const { open, enclosed, close } = match.groups ?? {};
		if (open && enclosed && close) {
			const capitalized = enclosed.capitalize();
			result = result.replace(match[0], `${open}${capitalized}${close}`);
			remainingText = remainingText.replace(match[0], "").trim(); // Remove processed section
		}
	}
	remainingText = remainingText.toTitle();
	result = result.replace(COMPILED_PATTERNS.WORD_BOUNDARY(remainingText), remainingText);
	return result;
}

function escapeRegex(string: string) {
	return string.replace(COMPILED_PATTERNS.REGEX_ESCAPE, "\\$&");
}

// Cache for compiled regex patterns to improve performance
const regexCache = new Map<string, RegExp>();

/**
 * Get or create a cached regex pattern
 */
export function getCachedRegex(pattern: string, flags = ""): RegExp {
	const key = `${pattern}|${flags}`;
	let regex = regexCache.get(key);
	if (!regex) {
		regex = new RegExp(pattern, flags);
		regexCache.set(key, regex);
	}
	return regex;
}
