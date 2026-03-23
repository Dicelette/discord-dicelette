import botEn from "@dicelette/localization/locales/en.json";
import botFr from "@dicelette/localization/locales/fr.json";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import en from "./en.json";
import fr from "./fr.json";
import { i18nContext, type Locale } from "./index";

const translations: Record<Locale, Record<string, unknown>> = { en, fr };
const botTranslations: Record<Locale, Record<string, unknown>> = {
	en: botEn,
	fr: botFr,
};

function resolvePath(obj: Record<string, unknown>, path: string): string | undefined {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (typeof current !== "object" || current === null || !(part in current))
			return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : undefined;
}

function getPath(locale: Locale, path: string): string {
	return (
		resolvePath(translations[locale], path) ??
		resolvePath(botTranslations[locale], path) ??
		path
	);
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(() => {
		const stored = localStorage.getItem("dicelette-locale");
		return stored === "en" || stored === "fr" ? stored : "fr";
	});

	const setLocale = useCallback((l: Locale) => {
		setLocaleState(l);
		localStorage.setItem("dicelette-locale", l);
	}, []);

	const t = useCallback(
		(key: string, vars?: Record<string, string | number>): string => {
			let str = getPath(locale, key);
			if (vars) {
				for (const [k, v] of Object.entries(vars)) {
					str = str.replace(`{${k}}`, String(v));
				}
			}
			return str;
		},
		[locale]
	);

	const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

	return <i18nContext.Provider value={value}>{children}</i18nContext.Provider>;
}
