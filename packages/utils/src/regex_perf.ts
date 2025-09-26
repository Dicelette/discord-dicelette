import { logger } from "./logger";

/**
 * Performance monitoring for regex operations
 * Can be disabled in production for maximum performance
 */
class RegexPerformanceMonitor {
	private static instance: RegexPerformanceMonitor;
	private enabled: boolean = process.env.NODE_ENV === "development";
	private stats = new Map<string, { count: number; totalTime: number }>();
	
	static getInstance(): RegexPerformanceMonitor {
		if (!RegexPerformanceMonitor.instance) {
			RegexPerformanceMonitor.instance = new RegexPerformanceMonitor();
		}
		return RegexPerformanceMonitor.instance;
	}
	
	trackRegexOperation<T>(
		operation: string,
		pattern: string,
		fn: () => T
	): T {
		if (!this.enabled) return fn();
		
		const key = `${operation}:${pattern}`;
		const start = performance.now();
		const result = fn();
		const end = performance.now();
		
		const existing = this.stats.get(key) || { count: 0, totalTime: 0 };
		this.stats.set(key, {
			count: existing.count + 1,
			totalTime: existing.totalTime + (end - start)
		});
		
		return result;
	}
	
	getStats() {
		if (!this.enabled) return null;
		
		const sorted = Array.from(this.stats.entries())
			.sort(([,a], [,b]) => b.totalTime - a.totalTime)
			.slice(0, 10);
			
		return sorted.map(([key, stats]) => ({
			operation: key,
			count: stats.count,
			totalTime: Math.round(stats.totalTime * 100) / 100,
			avgTime: Math.round((stats.totalTime / stats.count) * 100) / 100
		}));
	}
	
	logStats() {
		if (!this.enabled) return;
		
		const stats = this.getStats();
		if (stats && stats.length > 0) {
			logger.trace("Top regex performance stats:", stats);
		}
	}
	
	reset() {
		this.stats.clear();
	}
}

export const regexPerfMonitor = RegexPerformanceMonitor.getInstance();

// Export for testing
export { RegexPerformanceMonitor };