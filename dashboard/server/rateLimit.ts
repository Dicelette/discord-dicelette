/*
 * Sliding-window rate limiter.
 *
 * Design notes:
 *  - `makeRateLimit(max, windowMs)` returns a middleware backed by a single
 *    bucket Map. Callers MUST call it once at module load (never per-request)
 *    to avoid memory leaks and losing bucket state between requests.
 *  - Expired buckets are pruned lazily on each request (the bucket for the
 *    current key is filtered before insertion) and on a bounded sweep that
 *    runs only when the map grows past a soft threshold. No setInterval is
 *    kept, which avoids unrefed timers leaking when many limiters are
 *    created in tests or short-lived contexts.
 *
 * The stricter refresh limiter (5/min) is exposed as a pre-built singleton.
 */
import type { NextFunction, Request, Response } from "express";

const PRUNE_THRESHOLD = 1024;

export function makeRateLimit(max: number, windowMs: number) {
	const buckets = new Map<string, number[]>();

	function pruneIfLarge(now: number) {
		if (buckets.size < PRUNE_THRESHOLD) return;
		const cutoff = now - windowMs;
		for (const [key, hits] of buckets) {
			if (hits.length === 0 || hits[hits.length - 1] <= cutoff) buckets.delete(key);
		}
	}

	return function rateLimit(req: Request, res: Response, next: NextFunction): void {
		const key = (req.session as { userId?: string }).userId ?? req.ip ?? "anon";
		const now = Date.now();
		const cutoff = now - windowMs;
		const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
		if (hits.length >= max) {
			const retryAfter = Math.ceil((hits[0] - cutoff) / 1000);
			res.setHeader("Retry-After", String(retryAfter));
			res.status(429).json({ error: "Too many requests, please slow down." });
			return;
		}
		hits.push(now);
		buckets.set(key, hits);
		pruneIfLarge(now);
		next();
	};
}

/** 5 req/min per user for /api/auth/guilds/refresh — protects Discord OAuth calls. */
export const refreshRateLimit = makeRateLimit(5, 60_000);
