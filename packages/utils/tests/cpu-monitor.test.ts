import os from "node:os";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startCpuMonitor } from "../src/cpu-monitor";

function mockUsage(userMicros: number) {
	vi.spyOn(process, "cpuUsage").mockImplementation((prev?: NodeJS.CpuUsage) => {
		if (prev) return { system: 0, user: userMicros };
		return { system: 0, user: 0 };
	});
}

describe("startCpuMonitor", () => {
	let stop: (() => void) | undefined;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(os, "cpus").mockReturnValue([{} as os.CpuInfo]);
	});

	afterEach(() => {
		stop?.();
		stop = undefined;
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("fires onAlert when usage crosses the threshold", () => {
		mockUsage(900_000); // 900ms busy out of a 1000ms window on 1 core => 90%
		const onAlert = vi.fn();
		stop = startCpuMonitor({
			cooldownMs: 5000,
			intervalMs: 1000,
			onAlert,
			thresholdPercent: 80,
		});

		vi.advanceTimersByTime(1000);

		expect(onAlert).toHaveBeenCalledTimes(1);
		expect(onAlert).toHaveBeenCalledWith(expect.closeTo(90));
	});

	it("does not alert below the threshold", () => {
		mockUsage(100_000); // 10%
		const onAlert = vi.fn();
		stop = startCpuMonitor({
			cooldownMs: 5000,
			intervalMs: 1000,
			onAlert,
			thresholdPercent: 80,
		});

		vi.advanceTimersByTime(1000);

		expect(onAlert).not.toHaveBeenCalled();
	});

	it("respects the cooldown between alerts", () => {
		mockUsage(900_000);
		const onAlert = vi.fn();
		stop = startCpuMonitor({
			cooldownMs: 5000,
			intervalMs: 1000,
			onAlert,
			thresholdPercent: 80,
		});

		vi.advanceTimersByTime(3000); // ticks at 1s (alert), 2s, 3s: still within cooldown
		expect(onAlert).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(3000); // tick at 6s: cooldown elapsed since the 1s alert
		expect(onAlert).toHaveBeenCalledTimes(2);
	});

	it("stops sampling once the returned function is called", () => {
		mockUsage(900_000);
		const onAlert = vi.fn();
		const stopMonitor = startCpuMonitor({
			cooldownMs: 5000,
			intervalMs: 1000,
			onAlert,
			thresholdPercent: 80,
		});
		stopMonitor();

		vi.advanceTimersByTime(5000);

		expect(onAlert).not.toHaveBeenCalled();
	});
});
