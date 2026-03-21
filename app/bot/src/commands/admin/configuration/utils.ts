import { LocalePrimary } from "@dicelette/localization";
import * as Djs from "discord.js";

export const findLocale = (locale?: Djs.Locale) => {
	if (locale === Djs.Locale.EnglishUS || locale === Djs.Locale.EnglishGB)
		return "English";
	if (!locale) return undefined;
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === locale || abbr === locale;
	});
	const name = localeName?.[0];
	if (name) return LocalePrimary[name as keyof typeof LocalePrimary];
	return undefined;
};

export function formatDuration(seconds: number) {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes < 60)
		return remainingSeconds ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}
