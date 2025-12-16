// Pre-compiled regex patterns for better performance
export const QUERY_URL_PATTERNS = {
	AVATAR_URL: /^(https:\/{2})[\w\-./%]+\/[\w\-.%]+\.(jpe?g|gifv?|png|webp)$/gi,
	DISCORD_CDN: /(cdn|media)\.discordapp\.(net|com)/gi,
	PUNCTUATION_ENCLOSED: /(?<open>\p{P})(?<enclosed>.*?)(?<close>\p{P})/gu,
	QUERY_PARAMS: /\?.*$/g,
	REGEX_ESCAPE: /[.*+?^${}()|[\]\\]/g,
	VALID_EXTENSIONS: /\.?(jpe?g|gifv?|png|webp)$/gi,
	WORD_BOUNDARY: (text: string) => new RegExp(`\\b${escapeRegex(text)}\\b`, "gi"),
} as const;

export const DICE_PATTERNS = {
	BRACKET_ROLL: /\[(.*)\]/,
	BRACKETED_CONTENT: /^\[(.*)\]$/,
	DETECT_DICE_MESSAGE: /([\w.()]+|(\{.*\})) (.*)/i,
	DICE_VALUE: /^(\d+)?#?d\S+|\{.*\}/i,
	GLOBAL_COMMENTS: /(?:^|\s)# ?(.*)/,
	GLOBAL_COMMENTS_GROUP: /(?:^|\s)# ?(?<comment>.*)/,
	INFO_STATS_COMMENTS: /%%(\[__.*__\])%%/,
} as const;

export const DICE_COMPILED_PATTERNS = {
	COMMENTS_REGEX: /\[([^\]]*)\]/gi,
	DICE_EXPRESSION: /\{exp( ?\|\| ?(?<default>\d+))?\}/gi,
	//old version: /(?<first>([><=!]+)(.+?))(?<second>([><=!]+)(.+))
	OPPOSITION: /(?<first>(([><=]|!=)+)(.+?))(?<second>(([><=]|!=)+)(.+))/,
	TARGET_VALUE: /^\{(.*?)}$/,
	COMPARATOR: /(?<sign>([><=]|!=)+)(?<comparator>(.+))/,
	COMPARATOR_SIMPLE: /(([><=]|!=)+)(.+)/,
	STATS_REGEX_CACHE: new Map<string, RegExp>(),
} as const;

export const REMOVER_PATTERN = {
	ASTERISK_ESCAPE: /\*/g,
	CRITICAL_BLOCK: /\{\*?c[fs]:[<>=!]+.+?\}/gim,
	EXP_REMOVER: /\{exp(.*?)\}/g,
	SIGN_REMOVER: /([><=]|!=)+.*$/,
	STAT_COMMENTS_REMOVER: /%%.*%%/,
	STAT_MATCHER: /\$([\p{L}\p{M}_][\p{L}\p{M}0-9_]*)/giu,
} as const;

export const PARSE_RESULT_PATTERNS = {
	allSharedSymbols: /[✓✕◈※]/,
	beforeArrow: /^(?:※\s|◈\s[^—]+—\s)?/,
	commentBracket: /\[([^\]]+)\]/,
	diceResultPattern: /(?<entry>\S+) ⟶ (?<calc>.*) =/,
	dynamicDice: /(\d+d\([^)]+\))/,
	extractInfo: /%%(.*)%%/,
	formulaDiceSymbols: /^[✕✓]/,
	mathsSigns: /[<>]=?|!?==|[+\-*/]/,
	naturalDice: /\[(\d+)\]/gi,
	parenExpression: /\(([^)]+)\)/,
	resultEquals: / = (\S+)/g,
	sharedStartSymbol: /^◈\s+/,
	sharedSymbol: /^([※◈])/,
	successSymbol: /^◈\s+\*\*/,
} as const;

export const CHARACTER_DETECTION = / @([\p{L}\p{M}._-]+)/u;
export const MENTION_ID_DETECTION = /<[@#]&?(\d+)>>?/;
export const COMPILED_COMMENTS = /^(_ _|\s+)?(?<comment>\*.*?\*)$/gm;

export function verifyAvatarUrl(url: string) {
	if (url.length === 0) return false;
	// Reset lastIndex for global regex to avoid issues
	QUERY_URL_PATTERNS.AVATAR_URL.lastIndex = 0;
	QUERY_URL_PATTERNS.VALID_EXTENSIONS.lastIndex = 0;
	const [baseUrl] = url.split("?"); // Ignore query parameters for extension check
	if (baseUrl.match(QUERY_URL_PATTERNS.AVATAR_URL)) return url;
	if (
		baseUrl.match(QUERY_URL_PATTERNS.VALID_EXTENSIONS) &&
		url.startsWith("attachment://")
	)
		return url;
	return false;
}

export function cleanAvatarUrl(url: string) {
	if (url.match(QUERY_URL_PATTERNS.DISCORD_CDN))
		return url.replace(QUERY_URL_PATTERNS.QUERY_PARAMS, "");
	return url;
}

export function capitalizeBetweenPunct(input: string) {
	// Regex to find sections enclosed by punctuation marks
	let remainingText = input;
	let result = input;
	for (const match of input.matchAll(QUERY_URL_PATTERNS.PUNCTUATION_ENCLOSED)) {
		const { open, enclosed, close } = match.groups ?? {};
		if (open && enclosed && close) {
			const capitalized = enclosed.capitalize();
			result = result.replace(match[0], `${open}${capitalized}${close}`);
			remainingText = remainingText.replace(match[0], "").trim(); // Remove processed section
		}
	}
	remainingText = remainingText.toTitle();
	result = result.replace(QUERY_URL_PATTERNS.WORD_BOUNDARY(remainingText), remainingText);
	return result;
}

function escapeRegex(string: string) {
	return string.replace(QUERY_URL_PATTERNS.REGEX_ESCAPE, "\\$&");
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

// Generic overload: the return type depends on the input type
export function getIdFromMention<T extends string | undefined>(
	mention: T
): T extends string ? string : undefined;
// Broad overload to accept union arguments (helps when caller has string | undefined)
export function getIdFromMention(mention: string | undefined): string | undefined;
export function getIdFromMention(mention?: string): string | undefined {
	return mention?.replace(MENTION_ID_DETECTION, "$1");
}
