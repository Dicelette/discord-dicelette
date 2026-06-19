import type { Count, CriticalCount } from "@dicelette/types";
import { beforeEach, describe, expect, it } from "vitest";
import { addCount } from "../src/messages";

class CriticalCountMock {
	private store = new Map<string, Count>();
	get(guildId: string, userId: string): Count | undefined {
		return this.store.get(`${guildId}:${userId}`);
	}
	set(guildId: string, value: Count, userId: string) {
		this.store.set(`${guildId}:${userId}`, value);
	}
}

describe("criticalcount trivial behavior", () => {
	let criticalCount: CriticalCountMock;
	const guildId = "guild-1";
	const userId = "user-1";

	beforeEach(() => {
		criticalCount = new CriticalCountMock();
		const initial: Count = {
			consecutive: { failure: 2, success: 0 },
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 3,
			longestStreak: { failure: 2, success: 3 },
			success: 2,
		} as Count;
		criticalCount.set(guildId, initial, userId);
	});

	it("does not change consecutive when comparison is trivial (failure line)", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 1,
			success: 0,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			true
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.failure).toBe(4);
		expect(updated.consecutive?.failure).toBe(2);
		expect(updated.longestStreak?.failure).toBe(2);
	});

	it("increments consecutive when comparison is NOT trivial (failure line)", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 1,
			success: 0,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.failure).toBe(4);
		expect(updated.consecutive?.failure).toBe(3);
		expect(updated.longestStreak?.failure).toBe(3);
	});

	it("ignores consecutive for trivial success as well", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 1,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			true
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.success).toBe(3);
		expect(updated.consecutive?.failure).toBe(2);
		expect(updated.consecutive?.success).toBe(0);
		expect(updated.longestStreak?.success).toBe(3);
	});

	it("switches from failure streak to success streak only when NOT trivial", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 1,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.consecutive?.failure).toBe(0);
		expect(updated.consecutive?.success).toBe(1);
		expect(updated.longestStreak?.success).toBe(3);
		expect(updated.longestStreak?.failure).toBe(2);
	});

	it("preserves failure streak when message has no results (no-op message)", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 0,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.consecutive?.failure).toBe(2);
		expect(updated.consecutive?.success).toBe(0);
		expect(updated.longestStreak?.failure).toBe(2);
		expect(updated.longestStreak?.success).toBe(3);
	});

	it("preserves success streak when message has no results (no-op message)", () => {
		const successStreak: Count = {
			consecutive: { failure: 0, success: 4 },
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 1,
			longestStreak: { failure: 2, success: 4 },
			success: 5,
		};
		criticalCount.set(guildId, successStreak, userId);

		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 0,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		expect(updated.consecutive?.success).toBe(4);
		expect(updated.consecutive?.failure).toBe(0);
		expect(updated.longestStreak?.success).toBe(4);
	});

	it("critical failure triggers streak but does not double-count in consecutive", () => {
		const messageCount: Count = {
			criticalFailure: 1,
			criticalSuccess: 0,
			failure: 1,
			success: 0,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		// consecutive should add only messageCount.failure (not criticalFailure)
		expect(updated.consecutive?.failure).toBe(3);
		expect(updated.criticalFailure).toBe(1);
	});

	it("critical success triggers streak but does not double-count in consecutive", () => {
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 1,
			failure: 0,
			success: 1,
		};

		addCount(
			criticalCount as unknown as CriticalCount,
			userId,
			guildId,
			messageCount,
			false
		);
		const updated = criticalCount.get(guildId, userId)!;

		// consecutive should add only messageCount.success (not criticalSuccess)
		expect(updated.consecutive?.success).toBe(1);
		expect(updated.consecutive?.failure).toBe(0);
		expect(updated.criticalSuccess).toBe(1);
	});
});
