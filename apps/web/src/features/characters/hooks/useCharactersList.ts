import type { ApiCharacter } from "@dicelette/api";
import { useCallback, useEffect, useReducer, useRef } from "react";

interface State {
	characters: ApiCharacter[];
	loading: boolean;
	error: string | null;
	page: number;
	search: string;
}

type Action =
	| { type: "load_start" }
	| { type: "loaded"; characters: ApiCharacter[] }
	| { type: "set_error"; value: string | null }
	| { type: "set_page"; value: number }
	| { type: "set_search"; value: string };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "load_start":
			return { ...state, error: null };
		case "loaded":
			return { ...state, loading: false, characters: action.characters, page: 1 };
		case "set_error":
			return { ...state, error: action.value, loading: false };
		case "set_page":
			return { ...state, page: action.value };
		case "set_search":
			return { ...state, search: action.value, page: 1 };
	}
}

export function useCharactersList(
	guildId: string,
	loadFn: (guildId: string) => Promise<{ data: ApiCharacter[] }>,
	refreshToken: number,
	errorMessage: string
) {
	const lastRefreshToken = useRef(refreshToken);
	const [state, dispatch] = useReducer(reducer, {
		characters: [],
		loading: true,
		error: null,
		page: 1,
		search: "",
	});

	const load = useCallback(async () => {
		dispatch({ type: "load_start" });
		try {
			const res = await loadFn(guildId);
			dispatch({ type: "loaded", characters: res.data });
		} catch {
			dispatch({ type: "set_error", value: errorMessage });
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

	const setError = useCallback((value: string | null) => {
		dispatch({ type: "set_error", value });
	}, []);

	const setPage = useCallback((value: number) => {
		dispatch({ type: "set_page", value });
	}, []);

	const handleSearchChange = useCallback((value: string) => {
		dispatch({ type: "set_search", value });
	}, []);

	return {
		...state,
		setError,
		setPage,
		handleSearchChange,
	};
}
