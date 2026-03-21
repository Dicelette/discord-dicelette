import { createContext, useContext, useState, type ReactNode } from "react";
import { en } from "./en";
import { fr } from "./fr";

export type Locale = "en" | "fr";

const translations: Record<Locale, Record<string, unknown>> = { en, fr };

function getPath(obj: Record<string, unknown>, path: string): string {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (typeof current !== "object" || current === null || !(part in current))
			return path;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : path;
}

interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(() => {
		const stored = localStorage.getItem("dicelette-locale");
		return stored === "en" || stored === "fr" ? stored : "fr";
	});

	const setLocale = (l: Locale) => {
		setLocaleState(l);
		localStorage.setItem("dicelette-locale", l);
	};

	const t = (key: string, vars?: Record<string, string | number>): string => {
		let str = getPath(translations[locale], key);
		if (vars) {
			for (const [k, v] of Object.entries(vars)) {
				str = str.replace(`{${k}}`, String(v));
			}
		}
		return str;
	};

	return (
		<I18nContext.Provider value={{ locale, setLocale, t }}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
