import type { Translation } from "@dicelette/types";
import type { EClient } from "client";
import type { CommandInteraction } from "discord.js";
import { getFirstChar, getUserFromInteraction } from "./get_user";

/**
 * Get user data with automatic fallback to first character if no character name is provided.
 * This consolidates a common pattern where getUserFromInteraction is called, and if no character
 * is specified, getFirstChar is used as fallback.
 *
 * @param client - The Discord client instance
 * @param interaction - The command interaction
 * @param ul - Translation function
 * @param charName - Optional character name to look up
 * @param userId - User ID to fetch (defaults to interaction.user.id)
 * @param skipNotFound - Whether to skip "not found" error messages
 * @returns User data with optional character name, or undefined if not found
 */
export async function getUserWithFallback(
	client: EClient,
	interaction: CommandInteraction,
	ul: Translation,
	charName?: string,
	userId?: string,
	skipNotFound = false
) {
	const targetUserId = userId ?? interaction.user.id;

	// Try to get user data directly
	const result = await getUserFromInteraction(
		client,
		targetUserId,
		interaction,
		charName,
		{ skipNotFound: true }
	);

	// If character name was provided, return the result (even if undefined)
	if (charName) {
		return result
			? { userData: result.userData, charName: result.userData?.userName ?? undefined }
			: undefined;
	}

	// If we have data from the direct query, return it
	if (result?.userData) {
		return {
			userData: result.userData,
			charName: result.userData.userName ?? undefined,
		};
	}

	// Otherwise, fall back to getting the first character
	const char = await getFirstChar(client, interaction, ul, skipNotFound);
	if (!char) return undefined;

	return {
		userData: char.userStatistique?.userData,
		charName: char.optionChar,
	};
}
