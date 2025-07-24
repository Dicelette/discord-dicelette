/** biome-ignore-all lint/style/useNamingConvention: Legacy compatibility */

import process from "node:process";

export const TUTORIAL_IMAGES = [
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_1.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_2.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_3.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_4.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_5.png?raw=true",
];

export const LINKS = {
	fr: {
		bug: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=bug%2Ctriage%2Cfrench&projects=&template=bug_french.yml&title=%5BBug%5D%3A+",
		fr: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=enhancement%2Ctriage%2Cfrench&projects=&template=Request_french.yml&title=%5BFR%5D%3A+",
	},
	en: {
		bug: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=bug%2Ctriage%2Cenglish&projects=&template=bug_english.yml&title=%5BBug%5D%3A+",
		fr: "https://github.com/Dicelette/discord-dicelette/issues/new?assignees=lisandra-dev&labels=enhancement%2Ctriage%2Cenglish&projects=&template=request_english.yml&title=%5BFR%5D%3A+",
	},
} as const;

export const DISCORD_ERROR_CODE = [50001, 50013];
export const MATCH_API_ERROR = /DiscordAPIError\[(50001|50013)\]/;

// Regex patterns for dice detection
export const DICE_PATTERNS = {
	DETECT_DICE_MESSAGE: /([\w.]+|(\{.*\})) (.*)/i,
	BRACKET_ROLL: /\[(.*)\]/,
	DICE_VALUE: /^\S*#?d\S+|\{.*\}/i,
	GLOBAL_COMMENTS: /# ?(.*)/,
	BRACKETED_COMMENTS: /\[(.*)\]/,
	BRACKETED_CONTENT: /^\[(.*)\]$/,
	GLOBAL_COMMENTS_GROUP: /# ?(?<comment>.*)/,
} as const;

const MATH = {
	dev: "<:math:1394002307431010334>",
	prod: "<:math:1394002540143710358>",
} as const;

export const EMOJI_MATH = process.env.PROD ? MATH.prod : MATH.dev;

export const AND = "&";
