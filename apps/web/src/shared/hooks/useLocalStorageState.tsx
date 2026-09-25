import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Drop-in `useState` replacement that persists to `localStorage` under `key` (read on mount, written on every
 * change); shallow-merges a plain-object stored value over `initialValue`, and degrades gracefully if storage is unavailable. */
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
