/** Shared with the browser: only import browser-safe modules here (never `@dicelette/utils` barrel, `node:*` or Sentry). */
import { validateCustomFormula } from "@dicelette/core";
import { createRegexFromText, isRegex } from "../../../utils/src/regex";
import type { UserOptionDef } from "./types";

/**
 * Scalar per-user options. Adding an entry types `UserSettingsData`, validates the
 * dashboard PATCH and renders the field. The label lives in `userConfig.options.<key>.label`; the helper is
 * `userSettings.options.<key>.description` (or `userConfig.options.<key>.helper` with a `helperLink`).
 */
export const USER_OPTIONS = {
	customFormula: {
		helperLink: { href: "https://mathjs.org", text: "Mathjs" },
		kind: "string",
		section: "general",
		slash: {
			display: {
				description: "userSettings.formula.display.description",
				empty: "userSettings.formula.noDisplay",
				reply: "userSettings.formula.display.reply",
				subcommand: "display.title",
			},
			group: "userSettings.formula.title",
			groupDescription: "userSettings.formula.description",
			description: "userSettings.formula.set.description",
			messages: {
				invalid: "userSettings.formula.invalid",
				notFound: "userSettings.formula.notFound",
				reset: "userSettings.formula.reset",
				saved: "userSettings.formula.saved",
			},
			subcommand: "userSettings.formula.set.title",
			valueDescription: "userSettings.formula.set.formula",
			valueName: "common.formula",
			valueParam: "formula",
		},
		validate: (value) => {
			const result = validateCustomFormula(value);
			return result.ok ? null : result.error;
		},
	},
	prefixEditComment: {
		kind: "string",
		slash: true,
		section: "general",
		validate: (value: string) => {
			if (isRegex(value)) {
				try {
					createRegexFromText(value);
					return null;
				} catch (e) {
					return "userSettings.prefixEditComment.invalidRegex";
				}
			}
			return null;
		},
	},
	ignoreNotfound: {
		kind: "string",
		slash: {
			description: "userSettings.attributes.replaceUnknown.description",
			group: "userSettings.attributes.title",
			groupDescription: "userSettings.attributes.description",
			messages: {
				reset: "userSettings.attributes.replaceUnknown.reset",
				saved: "userSettings.attributes.replaceUnknown.set",
			},
			subcommand: "userSettings.attributes.replaceUnknown.title",
			valueDescription: "userSettings.attributes.replaceUnknown.options",
			valueName: "common.value",
		},
	},
} as const satisfies Record<string, UserOptionDef>;
