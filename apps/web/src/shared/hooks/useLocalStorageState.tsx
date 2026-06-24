import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Drop-in replacement for `useState` that persists the value to `localStorage`
 * under `key`. The initial value is read from storage on mount (falling back to
 * `initialValue` when absent or malformed), and every change is written back.
 *
 * When both the stored value and `initialValue` are plain objects, the stored
 * value is shallow-merged over `initialValue` so keys added to the schema after
 * a value was persisted fall back to their default instead of being `undefined`.
 *
 * Storage access is wrapped in try/catch so the hook degrades gracefully when
 * `localStorage` is unavailable (private browsing, quota exceeded, SSR).
 */
export function useLocalStorageState<T>(
	key: string,
	initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		try {
			const stored = localStorage.getItem(key);
			if (stored === null) return initialValue;
			const parsed = JSON.parse(stored);
			if (isPlainObject(parsed) && isPlainObject(initialValue))
				return { ...initialValue, ...parsed } as T;
			return parsed as T;
		} catch {
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage unavailable (private mode, quota) — keep working in-memory.
		}
	}, [key, value]);

	return [value, setValue];
}
