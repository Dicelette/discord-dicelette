/**
 * Utility functions for string similarity and distance calculations.
 */

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
