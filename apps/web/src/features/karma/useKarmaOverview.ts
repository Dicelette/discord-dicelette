import type { ApiKarmaOverview } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useEffect, useRef, useState } from "react";

const KARMA_LOAD_DEBOUNCE_MS = 150;

/** Loads a guild's karma overview (server stats, leaderboard, "me"); `reload()` resolves to success and works
 * even with `enabled: false` (which just skips the automatic load, e.g. before a karma tab opens). */
export function useKarmaOverview(guildId: string, enabled = true) {
	const { t } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;
	const [overview, setOverview] = useState<ApiKarmaOverview | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(
		async (signal?: AbortSignal): Promise<boolean> => {
			setLoading(true);
			setError(null);
			try {
				const res = await karmaApi.getOverview(guildId, { signal });
				if (signal?.aborted) return false;
				setOverview(res.data);
				return true;
			} catch {
				if (signal?.aborted) return false;
				setError(tRef.current("karma.loadError"));
				return false;
			} finally {
				if (!signal?.aborted) setLoading(false);
			}
		},
		[guildId]
	);

	useEffect(() => {
		if (!enabled) return;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => load(controller.signal), KARMA_LOAD_DEBOUNCE_MS);
		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [load, enabled]);

	return { overview, loading, error, reload: () => load() };
}
