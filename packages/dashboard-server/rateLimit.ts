/*
 * Stricter rate limit specifically for the refresh endpoint (5 req/min per user).
 * The outer auth router already has a 10/min limit from index.ts; this adds an additional guard so spamming refresh can't exhaust Discord OAuth calls even if the general limit is raised in the future.
 */
import type { NextFunction, Request, Response } from "express";

function makeRefreshRateLimit() {
	const buckets = new Map<string, number[]>();
	const Max = 5;
	const WindowMs = 60_000;
	setInterval(() => {
		const cutoff = Date.now() - WindowMs;
		for (const [key, hits] of buckets) {
			if (hits.every((t) => t <= cutoff)) buckets.delete(key);
		}
	}, WindowMs).unref();
	return (req: Request, res: Response, next: NextFunction): void => {
		const key = (req.session as { userId?: string }).userId ?? req.ip ?? "anon";
		const now = Date.now();
		const cutoff = now - WindowMs;
		const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
		if (hits.length >= Max) {
			const retryAfter = Math.ceil((hits[0] - cutoff) / 1000);
			res.setHeader("Retry-After", String(retryAfter));
			res.status(429).json({ error: "Too many refresh requests, please slow down." });
			return;
		}
		hits.push(now);
		buckets.set(key, hits);
		next();
	};
}

export const refreshRateLimit = makeRefreshRateLimit();
// ---------------------------------------------------------------------------
// Sliding-window rate limiter factory
// Creates a per-user (or per-IP as fallback) rate limiter.
// ---------------------------------------------------------------------------
export function makeRateLimit(max: number, windowMs: number) {
	const buckets = new Map<string, number[]>();
	// Purge stale keys periodically to prevent unbounded memory growth
	setInterval(() => {
		const cutoff = Date.now() - windowMs;
		for (const [key, hits] of buckets) {
			if (hits.every((t) => t <= cutoff)) buckets.delete(key);
		}
	}, windowMs).unref();
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
		next();
	};
}
