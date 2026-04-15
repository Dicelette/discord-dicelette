import { useEffect } from "react";

export function hasCaseInsensitiveDuplicate<T>(
	data: Record<string, T>,
	name: string,
	excludeName?: string
): boolean {
	return Object.keys(data).some(
		(key) => key !== excludeName && key.toLowerCase() === name.toLowerCase()
	);
}

export function renameRecordKey<T>(
	data: Record<string, T>,
	oldName: string,
	newName: string
): Record<string, T> | null {
	const entries = Object.entries(data);
	const index = entries.findIndex(([key]) => key === oldName);
	if (index === -1) return null;
	entries[index] = [newName, entries[index][1]];
	return Object.fromEntries(entries) as Record<string, T>;
}

export function useAutoResetFlag(
	value: boolean,
	onReset: () => void,
	delay = 3000
): void {
	useEffect(() => {
		if (!value) return;
		const timeoutId = setTimeout(onReset, delay);
		return () => clearTimeout(timeoutId);
	}, [delay, onReset, value]);
}

export async function readJsonObjectFile(file: File): Promise<Record<string, unknown>> {
	const content = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
		reader.readAsText(file);
	});

	const parsed: unknown = JSON.parse(content);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("Invalid JSON object");
	}

	return parsed as Record<string, unknown>;
}
