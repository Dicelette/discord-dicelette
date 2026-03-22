import { createContext, useContext } from "react";

export type Locale = "en" | "fr";

export interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
}

export const i18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
	const ctx = useContext(i18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}

