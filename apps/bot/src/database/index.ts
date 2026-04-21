import { resolveUserAttributes } from "@dicelette/helpers";
import type { UserData } from "@dicelette/types";
import { logger, uniformizeRecords } from "@dicelette/utils";
import type { EClient } from "client";

export * from "./delete_user";
export * from "./get_template";
export * from "./get_user";
export * from "./memory";
export * from "./register_user";

export function dedupeStatsDisplayNames(names: string[]): string[] {
	const seen = new Set<string>();
	const deduped: string[] = [];
	for (const rawName of names) {
		const name = rawName.trim();
		if (!name) continue;
		const normalized = name.standardize();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		deduped.push(name);
	}
	return deduped;
}

export function resolveStatsNames(
	userData: UserData | undefined,
	templateStats?: string[]
): string[] | undefined {
	if (userData?.displayStats && userData.displayStats.length > 0)
		return dedupeStatsDisplayNames(userData.displayStats);
	if (templateStats && templateStats.length > 0)
		return dedupeStatsDisplayNames(templateStats);
	const statsKeys = Object.keys(userData?.stats ?? {});
	if (statsKeys.length > 0) return dedupeStatsDisplayNames(statsKeys);
	return undefined;
}

export function mergeDisplayStats(
	client: EClient,
	getChara: UserData | undefined,
	guildId: string,
	userId: string
) {
	const templateStats = client.settings.get(guildId, "templateID.statsName") ?? [];
	const userDisplayStats =
		getChara?.displayStats?.length && getChara.displayStats.length > 0
			? getChara.displayStats
			: Object.keys(getChara?.stats ?? {});
	const attributes = client.userSettings.get(guildId, userId)?.attributes;
	const attributeNames = attributes ? Object.keys(attributes) : [];
	const merged = dedupeStatsDisplayNames([
		...templateStats,
		...attributeNames,
		...userDisplayStats,
	]);
	return merged.length > 0 ? merged : undefined;
}

export function mergeAttribute(
	client: EClient,
	getChara: UserData | undefined,
	guildId: string,
	userId: string
) {
	const normalizedCharaStats = getChara?.stats
		? (uniformizeRecords(getChara.stats) as Record<string, number>)
		: {};
	const attributes = client.userSettings.get(guildId, userId)?.attributes;
	const resolved = resolveUserAttributes(attributes);
	if (!resolved.ok) {
		logger.error("No attributes to resolve, returning chara stats only", { resolved });
		return Object.keys(normalizedCharaStats).length > 0
			? normalizedCharaStats
			: undefined;
	}
	const normalizedAttributes = resolved.value
		? (uniformizeRecords(resolved.value) as Record<string, number>)
		: {};
	return Object.assign({}, normalizedAttributes, normalizedCharaStats);
}
