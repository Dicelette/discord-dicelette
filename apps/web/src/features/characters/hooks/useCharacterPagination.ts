import type { ApiCharacter } from "@dicelette/api";
import { useMemo } from "react";

const PAGE_SIZE = 5;

interface UseCharacterPaginationProps {
	characters: ApiCharacter[];
	search: string;
	page: number;
	filterFn?: (char: ApiCharacter, query: string) => boolean;
}

export function useCharacterPagination({
	characters,
	search,
	page,
	filterFn,
}: UseCharacterPaginationProps) {
	const query = useMemo(() => search.trim().toLowerCase(), [search]);

	const filtered = useMemo(() => {
		if (!query) return characters;
		if (filterFn) return characters.filter((c) => filterFn(c, query));
		// Default filter: search character name
		return characters.filter((c) => (c.charName ?? "").toLowerCase().includes(query));
	}, [characters, query, filterFn]);

	const totalPages = useMemo(
		() => Math.ceil(filtered.length / PAGE_SIZE),
		[filtered.length]
	);

	const pageChars = useMemo(
		() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		[filtered, page]
	);

	return {
		filtered,
		totalPages,
		pageChars,
		query,
		PAGE_SIZE,
	};
}
