import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

/**
 * Drop-in replacement for `useState` that persists the value to `localStorage`
 * under `key`. The initial value is read from storage on mount (falling back to
 * `initialValue` when absent or malformed), and every change is written back.
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
			return stored !== null ? (JSON.parse(stored) as T) : initialValue;
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
