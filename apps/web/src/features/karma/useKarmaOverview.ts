import type { ApiKarmaOverview } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useEffect, useState } from "react";

/** Loads a guild's karma overview (server stats, leaderboard rows, "me"). `reload()` resolves to whether it succeeded. */
export function useKarmaOverview(guildId: string) {
	const { t } = useI18n();
	const [overview, setOverview] = useState<ApiKarmaOverview | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (): Promise<boolean> => {
		setLoading(true);
		setError(null);
		try {
			const res = await karmaApi.getOverview(guildId);
			setOverview(res.data);
			return true;
		} catch {
			setError(t("karma.loadError"));
			return false;
		} finally {
			setLoading(false);
		}
	}, [guildId, t]);

	useEffect(() => {
		load();
	}, [load]);

	return { overview, loading, error, reload: load };
}
