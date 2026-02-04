/**
 * Utility functions for string similarity and distance calculations.
 */

export const MIN_THRESHOLD_MATCH = 0.5;

/**
 * Calculates the similarity between two strings as a value between 0 and 1.
 */
export function calculateSimilarity(str1: string, str2: string): number {
	const longer = str1.length > str2.length ? str1 : str2;
	const shorter = str1.length > str2.length ? str2 : str1;
	if (longer.length === 0) return 1.0;
	const distance = levenshteinDistance(longer, shorter);
	return (longer.length - distance) / longer.length;
}

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
	const matrix = Array(str2.length + 1)
		.fill(null)
		.map(() => Array(str1.length + 1).fill(null));
	for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
	for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
	for (let j = 1; j <= str2.length; j++) {
		for (let i = 1; i <= str1.length; i++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
			matrix[j][i] = Math.min(
				matrix[j][i - 1] + 1, // insertion
				matrix[j - 1][i] + 1, // deletion
				matrix[j - 1][i - 1] + cost // substitution
			);
		}
	}
	return matrix[str2.length][str1.length];
}

// Helper: trouve la meilleure correspondance pour un token donné parmi les stats normalisées
export function findBestStatMatch<T>(
	searchTerm: string,
	normalizedStats: Map<string, T>,
	similarityThreshold = MIN_THRESHOLD_MATCH
): T | undefined {
	// recherche exacte
	const exact = normalizedStats.get(searchTerm);
	if (exact) return exact;

	// recherche partielle (startsWith, endsWith, includes) et choix du stat le plus court
	const candidates: Array<[T, number]> = [];
	for (const [normalizedKey, original] of normalizedStats) {
		if (normalizedKey.startsWith(searchTerm))
			candidates.push([original, normalizedKey.length]);
		else if (normalizedKey.endsWith(searchTerm))
			candidates.push([original, normalizedKey.length]);
		else if (normalizedKey.includes(searchTerm))
			candidates.push([original, normalizedKey.length]);
	}
	if (candidates.length > 0) {
		candidates.sort((a, b) => a[1] - b[1]);
		return candidates[0][0];
	}

	// fallback: recherche par similarité si aucune correspondance partielle trouvée
	let bestMatch: T | undefined;
	let bestSimilarity = 0;
	for (const [normalizedKey, original] of normalizedStats) {
		const similarity = calculateSimilarity(searchTerm, normalizedKey);
		if (similarity === 1) return original;
		if (similarity > bestSimilarity && similarity >= similarityThreshold) {
			bestSimilarity = similarity;
			bestMatch = original;
		}
	}
	return bestMatch;
}

/**
 * Find the snippet name with the highest similarity to `macroName`.
 * Single-pass O(n) algorithm: keeps the best (name, similarity) seen so far.
 * Returns `null` if no snippets or if the best similarity is < `minSimilarity`.
 * Tie-breaker: first encountered best similarity (deterministic).
 */
export function findBestSnippets(
	snippets: Record<string, string>,
	macroName: string
): string | null {
	let bestMatch: string | null = null;
	let bestSimilarity = -1; // so even 0 similarity is considered when snippets non-empty

	for (const name of Object.keys(snippets)) {
		const similarity = calculateSimilarity(macroName.normalize(), name.normalize());
		if (similarity === 1) return name;
		if (similarity > bestSimilarity) {
			bestSimilarity = similarity;
			bestMatch = name;
		}
	}
	return bestMatch && bestSimilarity >= MIN_THRESHOLD_MATCH ? bestMatch : null;
}
