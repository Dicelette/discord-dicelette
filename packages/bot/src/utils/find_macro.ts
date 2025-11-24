import { calculateSimilarity, logger } from "@dicelette/utils";
import type { EClient } from "@dicelette/bot-core";
import { getUserFromInteraction } from "database";
import type * as Djs from "discord.js";

/**
 * Get damage dice for a specific user and macro name
 */
async function getDamageDiceForUser(
	client: EClient,
	interaction: Djs.CommandInteraction,
	userId: string,
	charName: string | undefined | null,
	standardizedAtq: string
) {
	try {
		const specificUserData = (
			await getUserFromInteraction(client, userId, interaction, charName?.standardize())
		)?.userData;
		return specificUserData?.damage?.[standardizedAtq];
	} catch (error) {
		logger.warn(`Error getting data for character "${charName}":`, error);
		return undefined;
	}
}

/**
 * Find macro name with best similarity
 */
async function findMacroName(
	client: EClient,
	interaction: Djs.CommandInteraction,
	userId: string,
	userData: { charName?: string | null; damageName?: string[] },
	atqName: string,
	searchTerm: string,
	bestSimilarity: number,
	minSimilarity: number
): Promise<{
	perfectMatch?: {
		dice: string;
		attackName: string;
		charName?: string;
		similarity: number;
	};
	newBestMatch?: {
		dice: string;
		attackName: string;
		charName?: string;
		similarity: number;
	};
	newBestSimilarity?: number;
}> {
	const standardizedAtq = atqName.standardize();
	const similarity = calculateSimilarity(searchTerm, standardizedAtq);

	if (similarity === 1.0) {
		const dice = await getDamageDiceForUser(
			client,
			interaction,
			userId,
			userData.charName,
			standardizedAtq
		);
		if (dice) {
			return {
				perfectMatch: {
					attackName: atqName,
					charName: userData.charName ?? undefined,
					dice,
					similarity,
				},
			};
		}
	}

	if (similarity >= minSimilarity && similarity > bestSimilarity) {
		const dice = await getDamageDiceForUser(
			client,
			interaction,
			userId,
			userData.charName,
			standardizedAtq
		);
		if (dice) {
			return {
				newBestMatch: {
					attackName: atqName,
					charName: userData.charName ?? undefined,
					dice,
					similarity,
				},
				newBestSimilarity: similarity,
			};
		}
	}
	return {};
}

/**
 * Find the best matching dice for a user's macro name
 */
export async function findBestMatchingDice(
	client: EClient,
	interaction: Djs.CommandInteraction,
	userId: string,
	searchTerm: string,
	charOptions?: string
): Promise<{
	dice: string;
	attackName: string;
	charName?: string;
	similarity: number;
} | null> {
	const allUserData = client.settings.get(interaction.guild!.id, `user.${userId}`) ?? [];
	let bestMatch: {
		dice: string;
		attackName: string;
		charName?: string;
		similarity: number;
	} | null = null;
	let bestSimilarity = 0;
	const minSimilarity = 0.2;

	const processUserData = async (applyCharFilter: boolean) => {
		for (const userData of allUserData) {
			if (applyCharFilter && charOptions) {
				const charNameMatches =
					userData.charName?.toLowerCase().includes(charOptions.toLowerCase()) ||
					userData.charName?.subText(charOptions);
				if (!charNameMatches) continue;
			}
			const damageName = userData.damageName ?? [];
			for (const atqName of damageName) {
				if (charOptions) {
					logger.info(
						`Checking ${atqName.standardize()} against ${searchTerm}: similarity = ${calculateSimilarity(searchTerm, atqName.standardize())}`
					);
				}
				const result = await findMacroName(
					client,
					interaction,
					userId,
					userData,
					atqName,
					searchTerm,
					bestSimilarity,
					minSimilarity
				);
				if (result.perfectMatch) return result.perfectMatch;
				if (result.newBestMatch && result.newBestSimilarity) {
					bestMatch = result.newBestMatch;
					bestSimilarity = result.newBestSimilarity;
				}
			}
		}
		return undefined;
	};

	if (charOptions) {
		const perfect = await processUserData(true);
		if (perfect) return perfect;
		const perfectSecond = await processUserData(false);
		if (perfectSecond) return perfectSecond;
	} else {
		const perfect = await processUserData(false);
		if (perfect) return perfect;
	}
	return bestMatch;
}
