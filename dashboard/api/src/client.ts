import axios, {
	type AxiosError,
	AxiosHeaders,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";

export const api = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

/**
 * Fired on `window` whenever the server responds 429 (rate limited), so the
 * UI can surface a single "slow down" toast instead of every in-flight
 * request's own hook rendering its own error state.
 */
export const RATE_LIMIT_EVENT = "dicelette:rate-limited";

export interface RateLimitEventDetail {
	/** Seconds until the rate limit window resets, from the `Retry-After` header — `null` if absent/unparsable. */
	retryAfter: number | null;
}

interface EtagCacheEntry {
	etag: string;
	data: unknown;
}

/**
 * LRU cap for the client-side ETag cache. An unbounded Map would otherwise
 * grow for the lifetime of the SPA tab, because we never expire entries.
 * 256 is generous for the number of distinct GET endpoints the dashboard
 * hits while keeping the memory footprint trivial.
 */
const ETAG_CACHE_MAX = 256;

const etagCache = new Map<string, EtagCacheEntry>();

function etagCacheGet(key: string): EtagCacheEntry | undefined {
	const entry = etagCache.get(key);
	if (!entry) return undefined;
	// Re-insert to refresh recency (Map preserves insertion order).
	etagCache.delete(key);
	etagCache.set(key, entry);
	return entry;
}

function etagCacheSet(key: string, entry: EtagCacheEntry) {
	if (etagCache.has(key)) etagCache.delete(key);
	etagCache.set(key, entry);
	while (etagCache.size > ETAG_CACHE_MAX) {
		// Oldest key is first in iteration order.
		const oldest = etagCache.keys().next().value;
		if (oldest === undefined) break;
		etagCache.delete(oldest);
	}
}

/**
 * Build a stable cache key from method/url/params without JSON.stringify — the
 * stringify roundtrip was quadratic for large param objects and produced
 * different keys for equivalent objects with different key ordering.
 */
function stringifyParams(params: unknown): string {
	if (params == null) return "";
	if (typeof params !== "object") return String(params);
	const entries = Object.entries(params as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const parts: string[] = [];
	for (const [key, value] of entries) {
		if (Array.isArray(value)) {
			for (const v of value) parts.push(`${key}=${encodeURIComponent(String(v))}`);
		} else {
			parts.push(`${key}=${encodeURIComponent(String(value))}`);
		}
	}
	return parts.join("&");
}

function buildGetCacheKey(config: InternalAxiosRequestConfig): string | null {
	const method = (config.method ?? "get").toLowerCase();
	if (method !== "get") return null;
	const url = config.url ?? "";
	return `${url}?${stringifyParams(config.params)}`;
}

api.interceptors.request.use((config) => {
	const key = buildGetCacheKey(config);
	if (!key) return config;

	const cached = etagCacheGet(key);
	if (!cached) return config;

	if (config.headers && typeof config.headers.set === "function") {
		config.headers.set("If-None-Match", cached.etag);
	} else {
		const headers = AxiosHeaders.from(config.headers);
		headers.set("If-None-Match", cached.etag);
		config.headers = headers;
	}

	return config;
});

api.interceptors.response.use(
	(response) => {
		const key = buildGetCacheKey(response.config);
		if (!key) return response;

		const etag = response.headers?.etag;
		if (typeof etag === "string" && etag.length > 0) {
			etagCacheSet(key, { etag, data: response.data });
		}
		return response;
	},
	(error: AxiosError) => {
		const response = error.response;
		const config = error.config as InternalAxiosRequestConfig | undefined;
		if (response?.status === 429) {
			// Cast via `unknown` rather than assuming the DOM lib: this package is
			// also typechecked under the (Node-only, no DOM lib) root tsconfig.
			const browser = globalThis as unknown as {
				dispatchEvent?: (event: unknown) => void;
				CustomEvent?: new (type: string, init?: { detail?: unknown }) => unknown;
			};
			if (browser.dispatchEvent && browser.CustomEvent) {
				const parsed = Number(response.headers?.["retry-after"]);
				const detail: RateLimitEventDetail = {
					retryAfter: Number.isFinite(parsed) ? parsed : null,
				};
				browser.dispatchEvent(new browser.CustomEvent(RATE_LIMIT_EVENT, { detail }));
			}
		}
		if (response?.status === 304 && config) {
			const key = buildGetCacheKey(config);
			if (key) {
				const cached = etagCacheGet(key);
				if (cached) {
					const replay: AxiosResponse = {
						...response,
						status: 200,
						statusText: "OK",
						data: cached.data,
					};
					return Promise.resolve(replay);
				}
			}
		}

		return Promise.reject(error);
	}
);
