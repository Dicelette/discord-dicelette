import type { ApiCharacter } from "@dicelette/api";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCharactersList(
	guildId: string,
	loadFn: (guildId: string) => Promise<{ data: ApiCharacter[] }>,
	refreshToken: number,
	errorMessage: string
) {
	const lastRefreshToken = useRef(refreshToken);
	const [characters, setCharacters] = useState<ApiCharacter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await loadFn(guildId);
			setCharacters(res.data);
			setPage(1);
		} catch {
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [guildId, loadFn, errorMessage]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (lastRefreshToken.current === refreshToken) return;
		lastRefreshToken.current = refreshToken;
		load();
	}, [load, refreshToken]);

	const handleSearchChange = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	return {
		characters,
		loading,
		error,
		setError,
		page,
		setPage,
		search,
		handleSearchChange,
	};
}
