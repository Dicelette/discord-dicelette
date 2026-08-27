import type { ApiKarmaOverview } from "@dicelette/api";
import { karmaApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useEffect, useRef, useState } from "react";

const KARMA_LOAD_DEBOUNCE_MS = 150;

/**
 * Loads a guild's karma overview (server stats, leaderboard rows, "me").
 * `reload()` resolves to whether it succeeded. Pass `enabled: false` to skip
 * the automatic load (e.g. while neither karma tab has been opened yet) —
 * `reload()` still works regardless, for an explicit fetch-on-tab-switch.
 */
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
