/** biome-ignore-all lint/style/useNamingConvention: Legacy compatibility */

import process from "node:process";
import type { GuildData } from "./database";

export const TUTORIAL_IMAGES = [
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_1.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_2.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_3.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_4.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_5.png?raw=true",
];

export const LINKS = {
	en: {
		bug: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=bug%2Ctriage%2Cenglish&projects=&template=bug_english.yml&title=%5BBug%5D%3A+",
		docs: "https://dicelette.github.io/en/",
		fr: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=enhancement%2Ctriage%2Cenglish&projects=&template=request_english.yml&title=%5BFR%5D%3A+",
	},
	fr: {
		bug: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=bug%2Ctriage%2Cfrench&projects=&template=bug_french.yml&title=%5BBug%5D%3A+",
		docs: "https://dicelette.github.io/",
		fr: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=enhancement%2Ctriage%2Cfrench&projects=&template=Request_french.yml&title=%5BFR%5D%3A+",
	},
} as const;

export const DISCORD_ERROR_CODE = [50001, 50013];
export const MATCH_API_ERROR = /DiscordAPIError\[(50001|50013)\]/;

// Regex patterns for dice detection
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

const MATH = {
	dev: "<:math:1394002307431010334>",
	prod: "<:math:1394002540143710358>",
} as const;

export const EMOJI_MATH = process.env.NODE_ENV === "production" ? MATH.prod : MATH.dev;

export const AND = "&";

export enum LinksVariables {
	NAME = "{{name}}",
	INFO = "{{info}}",
	DICE = "{{dice}}",
	RESULTS = "{{results}}",
	LINK = "{{link}}",
	NAME_SHORT = "{{name:short}}",
	NAME_LONG = "{{name:long}}",
	INFO_SHORT = "{{info:short}}",
	INFO_LONG = "{{info:long}}",
}

export const DEFAULT_TEMPLATE: GuildData["createLinkTemplate"] = {
	final: `[[${LinksVariables.NAME}${LinksVariables.RESULTS}]](<${LinksVariables.LINK}>)`,
	format: {
		dice: `${LinksVariables.DICE}`,
		info: `${LinksVariables.INFO} -`,
		name: `__${LinksVariables.NAME}__: `,
	},
	joinResult: "; ",
	results: `${LinksVariables.INFO} \`${LinksVariables.DICE}\``,
};
