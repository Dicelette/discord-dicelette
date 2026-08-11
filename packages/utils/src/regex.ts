// Pre-compiled regex patterns for better performance

export const QUERY_URL_PATTERNS = {
	AVATAR_URL: /^(https:\/{2})[\w\-./%]+\/[\w\-.%]+\.(jpe?g|gifv?|png|webp)$/gi,
	DISCORD_CDN: /(cdn|media)\.discordapp\.(net|com)/gi,
	PUNCTUATION_ENCLOSED: /(?<open>\p{P})(?<enclosed>.*?)(?<close>\p{P})/gu,
	QUERY_PARAMS: /\?.*$/g,
	REGEX_ESCAPE: /[.*+?^${}()|[\]\\]/g,
	VALID_EXTENSIONS: /\.?(jpe?g|gifv?|png|webp)$/gi,
	WORD_BOUNDARY: (text: string) => new RegExp(`\\b${RegExp.escape(text)}\\b`, "gi"),
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

/** Source of a `{{…}}` formula block, allowing one level of nested single braces (`{cs:…}`). */
export const FORMULA_BLOCK_SOURCE = "\\{\\{((?:[^{}]|\\{[^{}]*\\})*)\\}\\}";

/** `DETECT_DICE_MESSAGE` with capture indices, so a match found on a masked copy can be sliced out of the original. */
const DETECT_DICE_MESSAGE_INDICES = new RegExp(
	DICE_PATTERNS.DETECT_DICE_MESSAGE.source,
	"di"
);

/**
 * Replaces every `{{…}}` formula block with a same-length, space-free stand-in.
 *
 * `DETECT_DICE_MESSAGE` splits a message on its first space, so a custom formula expanded
 * before stat substitution (`1d100<={{($vita + $combat)}}`) would be cut in half and its
 * tail parsed as a comment — leaving `$stat` tokens behind for the dice parser. Masking
 * preserves offsets and lengths, so a match found on the masked copy maps 1:1 onto the
 * original string.
 */
function maskFormulaBlocks(content: string): string {
	// Global, but only ever used through `replace`, which resets `lastIndex` itself.
	return content.replace(FORMULA_BLOCK_MASK, (block) => "0".repeat(block.length));
}
const FORMULA_BLOCK_MASK = new RegExp(FORMULA_BLOCK_SOURCE, "g");

/** The `DETECT_DICE_MESSAGE` split of a dice message, blind to the interior of `{{…}}` blocks. */
export function matchBareComment(content: string):
	| {
			/** Index of the whole heuristic match in `content`. */
			start: number;
			/** Index just past the whole heuristic match. */
			end: number;
			/** The dice part (group 1), as it appears in `content`. */
			dice: string;
			/** The trailing free text (group 3), as it appears in `content`. May be empty. */
			comment: string;
	  }
	| undefined {
	const match = DETECT_DICE_MESSAGE_INDICES.exec(maskFormulaBlocks(content));
	const indices = match?.indices;
	if (!match || !indices?.[1] || !indices[3]) return undefined;
	return {
		comment: content.slice(indices[3][0], indices[3][1]),
		dice: content.slice(indices[1][0], indices[1][1]),
		end: match.index + match[0].length,
		start: match.index,
	};
}

/**
 * The trailing free-text comment of a dice message (the `DETECT_DICE_MESSAGE` group 3),
 * without ever cutting into a `{{…}}` formula block.
 */
export function bareComment(content: string): string | undefined {
	return matchBareComment(content)?.comment;
}

/** `content` stripped of its trailing free-text comment — the `DETECT_DICE_MESSAGE → "$1"` rewrite. */
export function stripBareComment(content: string): string {
	const found = matchBareComment(content);
	if (!found) return content;
	return content.slice(0, found.start) + found.dice + content.slice(found.end);
}

export const DICE_COMPILED_PATTERNS = {
	COMMENTS_REGEX: /\[([^\]]*)\]/gi,
	COMPARATOR: /(?<sign>([><=]|!=)+)(?<comparator>(.+))/,
	COMPARATOR_SIMPLE: /(([><=]|!=)+)(.+)/,
	DICE_EXPRESSION: /\{exp( ?\|\| ?(?<default>\d+))?\}/gi,
	/** Matches dice notation (e.g. `1d6`, `d20`, `2d10`) within a larger expression. Used for search-and-replace inside `{{...}}` formula blocks. */
	DICE_IN_FORMULA: /\b\d*d\d+\b/gi,
	DOUBLE_TARGET: /^\{2}(?<dice>.*?)\{{2}(?<comments>(?:^|\s)# ?(.*))?$/,
	OPPOSITION: /(?<first>(([><=]|!=)+)([^<>=!]+))(?<second>(([><=]|!=)+)([^<>=!]+))/,
	/** `(stat1|stat2|…)` compiled once per alphabet. Used by `filterStatsInDamage`. */
	STATS_REGEX_CACHE: new Map<string, RegExp>(),
	/** `\((stat1|stat2|…)\)` for `replaceStatInDiceName` — same hot path, same keys. */
	STATS_PAREN_REGEX_CACHE: new Map<string, RegExp>(),
	/** `\((?<formula>stat1|stat2|…)\)` for `convertNameToValue`. */
	STATS_NAMED_REGEX_CACHE: new Map<string, RegExp>(),
	TARGET_VALUE: /^\{(?<dice>.*?)}(?<comments>(?:^|\s)# ?(.*))?$/,
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
	/**
	 * A single line's trailing italic span, capturing whatever precedes it (e.g. an
	 * `[__Stat__] ` info-roll header) as `prefix`. Unlike `COMPILED_COMMENTS`, the prefix
	 * isn't restricted to whitespace/`_ _` — callers that need to rule out matching inside a
	 * dice-result line (which can itself contain `**bold**`) must do so before testing this.
	 * `comment` is `undefined` when the line has no trailing italic span at all.
	 */
	trailingComment: /^(?<prefix>.*?)(?:\*(?<comment>.*)\*)?$/,
} as const;

export const CHARACTER_DETECTION = / @([\p{L}\p{M}._-]+)/u;
export const MENTION_ID_DETECTION = /<[@#]&?(\d+)>>?/;
export const COMPILED_COMMENTS = /^(_ _|\s+)?(?<comment>\*.*?\*)$/gm;
/** The `*<@id>*` (or `<@id>*`/`*<@id>`) mention embedded in a rendered roll-result message. */
export const ROLL_MENTION_PATTERN = /\*<?@(?<id>\d+)>?\*/;
/** A Discord message link, as produced by `createUrl()` (`https://discord.com/channels/g/c/m`). */
export const MESSAGE_LINK_PATTERN =
	/https:\/\/discord\.com\/channels\/(?<guildId>\d+)\/(?<channelId>\d+)\/(?<messageId>\d+)/;

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
// Cache for compiled regex patterns to improve performance

// Generic overload: the return type depends on the input type
export function getIdFromMention<T extends string | undefined>(
	mention: T
): T extends string ? string : undefined;
// Broad overload to accept union arguments (helps when caller has string | undefined)
export function getIdFromMention(mention: string | undefined): string | undefined;
export function getIdFromMention(mention?: string): string | undefined {
	return mention?.replace(MENTION_ID_DETECTION, "$1");
}
