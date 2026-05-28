import type { EClient } from "@dicelette/client";
import { calculateSimilarity, MIN_THRESHOLD_MATCH } from "@dicelette/core";
import { logger } from "@dicelette/utils";
import { getUserFromInteraction } from "database";
import type * as Djs from "discord.js";

type MacroSourceEntry = {
	charName?: string | null;
	damageName?: string[];
};

function buildSettingsEntries(
	data: { charName?: string | null; damageName?: string[] }[]
): MacroSourceEntry[] {
	return data.map((entry) => ({
		charName: entry.charName,
		damageName: entry.damageName ?? [],
	}));
}

function buildMemoryEntries(
	data: { userName?: string | null; damage?: Record<string, string> }[]
): MacroSourceEntry[] {
	return data.map((entry) => ({
		charName: entry.userName,
		damageName: Object.keys(entry.damage ?? {}),
	}));
}

function findScopedEntries(entries: MacroSourceEntry[], charOptions?: string) {
	if (!charOptions) return entries;
	return entries.filter((entry) => {
		const charName = entry.charName;
		if (!charName) return false;
		return (
			charName.subText(charOptions) ||
			charName.toLowerCase().includes(charOptions.toLowerCase())
		);
	});
}

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
	bestSimilarity: number
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

	if (similarity >= MIN_THRESHOLD_MATCH && similarity > bestSimilarity) {
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
	const settingsUserData =
		client.settings.get(interaction.guild!.id, `user.${userId}`) ?? [];
	const memoryUserData = client.characters.get(interaction.guild!.id, userId) ?? [];
	const settingsEntries = buildSettingsEntries(settingsUserData);
	const memoryEntries = buildMemoryEntries(memoryUserData);
	let bestMatch: {
		dice: string;
		attackName: string;
		charName?: string;
		similarity: number;
	} | null = null;
	let bestSimilarity = 0;

	const processEntries = async (entries: MacroSourceEntry[]) => {
		for (const userData of entries) {
			const damageName = userData.damageName ?? [];
			for (const atqName of damageName) {
				const result = await findMacroName(
					client,
					interaction,
					userId,
					userData,
					atqName,
					searchTerm,
					bestSimilarity
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
		const scopedSettings = findScopedEntries(settingsEntries, charOptions);
		const scopedMemory = findScopedEntries(memoryEntries, charOptions);
		const unscopedSettings = settingsEntries;
		const unscopedMemory = memoryEntries;
		const searchOrder = [scopedSettings, scopedMemory, unscopedSettings, unscopedMemory];
		for (const entries of searchOrder) {
			const perfect = await processEntries(entries);
			if (perfect) return perfect;
		}
	} else {
		const searchOrder = [settingsEntries, memoryEntries];
		for (const entries of searchOrder) {
			const perfect = await processEntries(entries);
			if (perfect) return perfect;
		}
	}
	return bestMatch;
}
