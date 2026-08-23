import type { ApiKarmaOverview } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useEffect, useRef, useState } from "react";

/** Loads a guild's karma overview (server stats, leaderboard rows, "me") and reloads on `refreshToken` bumps. */
export function useKarmaOverview(guildId: string, refreshToken = 0) {
	const { t } = useI18n();
	const [overview, setOverview] = useState<ApiKarmaOverview | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const lastRefreshToken = useRef(refreshToken);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await karmaApi.getOverview(guildId);
			setOverview(res.data);
		} catch {
			setError(t("karma.loadError"));
		} finally {
			setLoading(false);
		}
	}, [guildId, t]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (lastRefreshToken.current === refreshToken) return;
		lastRefreshToken.current = refreshToken;
		load();
	}, [load, refreshToken]);

	return { overview, loading, error, reload: load };
}
