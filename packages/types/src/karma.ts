import type { Count } from "..";

/**
 * A single user's karma entry — a `DBCount` value (see `@dicelette/types`)
 * augmented with the id/display name needed to render it in the dashboard.
 * Used both for the own/search list and the public share page.
 */
export interface ApiKarmaEntry extends Count {
	userId: string;
	/** Display name (globalName, or the raw username if unset) — `null` if unresolvable. */
	displayName: string | null;
	/** Discord handle, formatted as @username — `null` if unresolvable. */
	username: string | null;
	/** Per-guild avatar URL (falls back to the global Discord avatar) — `null` if unresolvable. */
	avatar: string | null;
}

export interface ApiKarmaOverview {
	/** The requesting user's own karma — `null` if they have no tracked rolls yet. */
	me: Count | null;
	/** The requesting user's own avatar URL — `null` if unresolvable. */
	meAvatar: string | null;
	server: {
		rollTotal: number;
		usersWithCounts: number;
		totalCount: Count;
		avg: Record<"success" | "failure" | "criticalSuccess" | "criticalFailure", string>;
		percent: Record<
			"success" | "failure" | "criticalSuccess" | "criticalFailure",
			string
		>;
	};
	/** Every user tracked in the karma DB — powers the dashboard's search. */
	users: ApiKarmaEntry[];
}

/** Public, unauthenticated payload for a shareable leaderboard link. */
export interface ApiKarmaLeaderboard {
	users: ApiKarmaEntry[];
}
