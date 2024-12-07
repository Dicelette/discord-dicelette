import { LocalePrimary, resources } from "@dicelette/localization";
import * as Djs from "discord.js";

export const localeList = Object.keys(Djs.Locale)
	.map((key) => {
		return {
			name: key,
			value: Djs.Locale[key as keyof typeof Djs.Locale],
		};
	})
	.filter((x) => Object.keys(resources).includes(x.value))
	.map((x) => {
		return {
			name: LocalePrimary[x.name as keyof typeof LocalePrimary],
			value: x.value as Djs.Locale,
		};
	});
localeList.push({ name: LocalePrimary.English, value: Djs.Locale.EnglishUS });
