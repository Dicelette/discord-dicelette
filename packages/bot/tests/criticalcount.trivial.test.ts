import type { Count } from "@dicelette/types";
import { beforeEach, describe, expect, it } from "vitest";

// Minimal CriticalCount mock implementing get/set per guild+user
class CriticalCountMock {
	private store = new Map<string, Count>();
	get(guildId: string, userId: string): Count | undefined {
		return this.store.get(`${guildId}:${userId}`);
	}
	set(guildId: string, value: Count, userId: string) {
		this.store.set(`${guildId}:${userId}`, value);
	}
}

// Inline implementations of the core logic we're testing
function addCountLogic(
	existing: Count | undefined,
	messageCount: Count,
	isTrivial = false
): Count {
	if (!existing) {
		return messageCount;
	}

	const newCount: Count = {
		criticalFailure: existing.criticalFailure + messageCount.criticalFailure,
		criticalSuccess: existing.criticalSuccess + messageCount.criticalSuccess,
		failure: existing.failure + messageCount.failure,
		success: existing.success + messageCount.success,
	};

	// If the comparison is trivial, we ignore consecutive series
	if (isTrivial) {
		newCount.consecutive = existing.consecutive ?? { failure: 0, success: 0 };
		newCount.longestStreak = existing.longestStreak ?? { failure: 0, success: 0 };
	} else if (messageCount.failure || messageCount.criticalFailure) {
		newCount.consecutive = {
			failure:
				(existing.consecutive?.failure ?? 0) +
				messageCount.failure +
				messageCount.criticalFailure,
			success: 0,
		};
		newCount.longestStreak = {
			failure: Math.max(
				existing.longestStreak?.failure ?? 0,
				newCount.consecutive.failure
			),
			success: existing.longestStreak?.success ?? 0,
		};
	} else {
		newCount.consecutive = {
			failure: 0,
			success:
				(existing.consecutive?.success ?? 0) +
				messageCount.success +
				messageCount.criticalSuccess,
		};
		newCount.longestStreak = {
			failure: existing.longestStreak?.failure ?? 0,
			success: Math.max(
				existing.longestStreak?.success ?? 0,
				newCount.consecutive.success
			),
		};
	}

	return newCount;
}

describe("criticalcount trivial behavior", () => {
	let criticalCount: CriticalCountMock;
	const guildId = "guild-1";
	const userId = "user-1";

	beforeEach(() => {
		criticalCount = new CriticalCountMock();
		// Seed initial count with some ongoing failure streak
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
		const existing = criticalCount.get(guildId, userId)!;
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 1,
			success: 0,
		};

		// Apply the logic with isTrivial = true
		const updated = addCountLogic(existing, messageCount, true);

		// Totals should update (failure incremented)
		expect(updated.failure).toBe(4);
		// Consecutive should remain unchanged
		expect(updated.consecutive?.failure).toBe(2);
		// Longest streak unchanged
		expect(updated.longestStreak?.failure).toBe(2);
	});

	it("increments consecutive when comparison is NOT trivial (failure line)", () => {
		const existing = criticalCount.get(guildId, userId)!;
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 1,
			success: 0,
		};

		// Apply the logic with isTrivial = false
		const updated = addCountLogic(existing, messageCount, false);

		expect(updated.failure).toBe(4);
		expect(updated.consecutive?.failure).toBe(3);
		expect(updated.longestStreak?.failure).toBe(3);
	});

	it("ignores consecutive for trivial success as well", () => {
		const existing = criticalCount.get(guildId, userId)!;
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 1,
		};

		// Apply the logic with isTrivial = true for a success message
		const updated = addCountLogic(existing, messageCount, true);

		expect(updated.success).toBe(3);
		// Should not reset failure streak nor increase success streak
		expect(updated.consecutive?.failure).toBe(2);
		expect(updated.consecutive?.success).toBe(0);
		expect(updated.longestStreak?.success).toBe(3);
	});

	it("switches from failure streak to success streak only when NOT trivial", () => {
		const existing = criticalCount.get(guildId, userId)!;
		const messageCount: Count = {
			criticalFailure: 0,
			criticalSuccess: 0,
			failure: 0,
			success: 1,
		};

		// Non-trivial success should reset failure streak and start success streak
		const updated = addCountLogic(existing, messageCount, false);

		expect(updated.consecutive?.failure).toBe(0);
		expect(updated.consecutive?.success).toBe(1);
		expect(updated.longestStreak?.success).toBe(3);
		expect(updated.longestStreak?.failure).toBe(2);
	});
});
