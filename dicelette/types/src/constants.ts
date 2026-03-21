/** biome-ignore-all lint/style/useNamingConvention: Legacy compatibility */

import process from "node:process";
import type { Translation } from "..";
import type { TemplateResult } from "./database";

export const MIN_THRESHOLD_MATCH = 0.5;

export const TUTORIAL_IMAGES = [
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_1.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_2.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_3.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_4.png?raw=true",
	"https://github.com/Dicelette/dicelette.github.io/blob/main/static/assets/tuto/allow_commands_5.png?raw=true",
];

export const LINKS = {
	buttons: {
		discord: "https://discord.gg/cfduUxFaZR",
		github: "https://github.com/Dicelette/discord-dicelette/",
		kofi: "https://ko-fi.com/mara__li",
	},
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
	icons: {
		dev: {
			discord: "1459934829385875690",
			github: "1459936027769700621",
			kofi: "1459935650173292853",
		},
		prod: {
			discord: "1459974851006562396",
			github: "1459974906312917167",
			kofi: "1459974972570075441",
		},
	},
} as const;

export const DISCORD_ERROR_CODE = [50001, 50013];
export const MATCH_API_ERROR = /DiscordAPIError\[(50001|50013)\]/;

// Regex patterns for dice detection

const MATH = {
	dev: "<:math:1394002307431010334>_ _",
	prod: "<:math:1394002540143710358>_ _",
} as const;

export const EMOJI_MATH = process.env.NODE_ENV === "production" ? MATH.prod : MATH.dev;

export const AND = "&";

export const IGNORE_COUNT_KEY = {
	emoji: "ⁱ",
	key: "/ignore/",
};

export enum LinksVariables {
	NAME = "{{name}}",
	INFO = "{{info}}",
	DICE = "{{dice}}",
	RESULTS = "{{results}}",
	LINK = "{{link}}",
	CHARACTER = "{{character}}",
	ORIGINAL_DICE = "{{original_dice}}",
}

export const DEFAULT_TEMPLATE = (ul: Translation): TemplateResult => {
	return {
		final: `[[${LinksVariables.NAME}${LinksVariables.RESULTS}]](<${LinksVariables.LINK}>)`,
		format: {
			character: `${LinksVariables.CHARACTER}`,
			dice: `${LinksVariables.DICE}`,
			info: `${LinksVariables.INFO} -`,
			name: `__${LinksVariables.NAME}__${ul("common.space")}: `,
			originalDice: `${LinksVariables.ORIGINAL_DICE}`,
		},
		joinResult: "; ",
		results: `${LinksVariables.INFO} \`${LinksVariables.DICE}\``,
	};
};
