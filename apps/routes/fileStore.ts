/**
 * Minimal file-backed session store for express-session.
 * No extra dependencies — uses only Node.js built-ins.
 * Each session is stored as a JSON file under `dir/`.
 * Expired sessions are lazily deleted on read.
 */

import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import session from "express-session";

interface StoredSession {
	expires: number;
	data: session.SessionData;
}

export class FileStore extends session.Store {
	private dir: string;

	constructor(dir: string) {
		super();
		this.dir = dir;
		mkdirSync(dir, { recursive: true });
	}

	private file(sid: string): string {
		// Sanitize sid to prevent path traversal
		const safe = sid.replace(/[^a-zA-Z0-9_-]/g, "_");
		return join(this.dir, `${safe}.json`);
	}

	get(
		sid: string,
		callback: (err: unknown, session?: session.SessionData | null) => void
	): void {
		try {
			const stored = JSON.parse(readFileSync(this.file(sid), "utf8")) as StoredSession;
			if (Date.now() > stored.expires) {
				this.destroy(sid, () => {});
				callback(null, null);
				return;
			}
			callback(null, stored.data);
		} catch {
			callback(null, null);
		}
	}

	set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {
		try {
			const expires = sessionData.cookie.expires
				? new Date(sessionData.cookie.expires).getTime()
				: Date.now() + (sessionData.cookie.maxAge ?? 7 * 24 * 60 * 60 * 1000);
			const stored: StoredSession = { expires, data: sessionData };
			writeFileSync(this.file(sid), JSON.stringify(stored));
			callback?.();
		} catch (err) {
			callback?.(err);
		}
	}

	destroy(sid: string, callback?: (err?: unknown) => void): void {
		try {
			unlinkSync(this.file(sid));
		} catch {
			// File may already be gone — not an error
		}
		callback?.();
	}

	touch(
		sid: string,
		sessionData: session.SessionData,
		callback?: (err?: unknown) => void
	): void {
		this.set(sid, sessionData, callback);
	}

	/** Prune all expired session files. Call periodically if needed. */
	prune(): void {
		try {
			for (const file of readdirSync(this.dir)) {
				if (!file.endsWith(".json")) continue;
				try {
					const stored = JSON.parse(
						readFileSync(join(this.dir, file), "utf8")
					) as StoredSession;
					if (Date.now() > stored.expires) unlinkSync(join(this.dir, file));
				} catch {
					// Ignore malformed files
				}
			}
		} catch {
			// Ignore if dir is not readable
		}
	}
}
