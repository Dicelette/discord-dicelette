import os from "node:os";
import process from "node:process";
import { important, sentry } from "./logger";

export interface CpuMonitorOptions {
	/** CPU usage percent (0-100, relative to a single core) above which a warning fires. Default 80. */
	thresholdPercent?: number;
	/** How often to sample usage, in ms. Default 30s. */
	intervalMs?: number;
	/** Minimum delay between two alerts, in ms, so a sustained spike doesn't spam. Default 5min. */
	cooldownMs?: number;
	/** Called whenever the threshold is crossed (after cooldown), e.g. to notify Discord. */
	onAlert?: (usagePercent: number) => void | Promise<void>;
}

/**
 * Samples this process' CPU usage on an interval and warns (log + Sentry + optional callback)
 * whenever it stays above `thresholdPercent` for longer than `cooldownMs` allows re-alerting.
 * Returns a function to stop the monitor.
 */
export function startCpuMonitor(options: CpuMonitorOptions = {}): () => void {
	const {
		thresholdPercent = 80,
		intervalMs = 30_000,
		cooldownMs = 5 * 60_000,
		onAlert,
	} = options;

	const cpuCount = os.cpus().length || 1;
	let lastUsage = process.cpuUsage();
	let lastCheck = Date.now();
	let lastAlertAt = 0;

	const timer = setInterval(() => {
		const now = Date.now();
		const elapsedMs = now - lastCheck;
		const usage = process.cpuUsage(lastUsage);
		lastUsage = process.cpuUsage();
		lastCheck = now;

		const usedMs = (usage.user + usage.system) / 1000;
		const percent = (usedMs / (elapsedMs * cpuCount)) * 100;

		if (percent >= thresholdPercent && now - lastAlertAt >= cooldownMs) {
			lastAlertAt = now;
			const message = `High CPU usage detected: ${percent.toFixed(1)}% (threshold: ${thresholdPercent}%)`;
			important.warn(message);
			sentry.warn(message, { cpuPercent: percent, thresholdPercent });
			void onAlert?.(percent);
		}
	}, intervalMs);
	timer.unref();

	return () => clearInterval(timer);
}
