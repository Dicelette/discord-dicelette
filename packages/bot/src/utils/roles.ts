import type { Settings } from "@dicelette/types";
import * as Djs from "discord.js";
import { fetchChannel } from "./fetch";

async function fetchDiceRole(diceEmbed: boolean, guild: Djs.Guild, role?: string) {
	if (!diceEmbed || !role) return;
	const diceRole = guild.roles.cache.get(role);
	if (!diceRole) return await guild.roles.fetch(role);
	return diceRole;
}

async function fetchStatsRole(statsEmbed: boolean, guild: Djs.Guild, role?: string) {
	if (!statsEmbed || !role) return;
	const statsRole = guild.roles.cache.get(role);
	if (!statsRole) return await guild.roles.fetch(role);
	return statsRole;
}

export function haveAccess(
	interaction: Djs.BaseInteraction,
	thread: Djs.GuildChannelResolvable,
	user?: string
): boolean {
	if (!user) return false;
	if (user === interaction.user.id) return true;
	//verify if the user have access to the channel/thread, like reading the channel
	const member = interaction.guild?.members.cache.get(interaction.user.id);
	if (!member || !thread) return false;
	return (
		member.permissions.has(Djs.PermissionFlagsBits.ManageRoles) ||
		member.permissionsIn(thread).has(Djs.PermissionFlagsBits.ViewChannel)
	);
}

export function pingModeratorRole(guild: Djs.Guild) {
	return guild.roles.cache
		.filter((role) => role.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles))
		.filter((role) => role.mentionable)
		.map((role) => `<@&${role.id}>`)
		.join(", ");
}

export async function addAutoRole(
	interaction: Djs.BaseInteraction,
	member: string,
	diceEmbed: boolean,
	statsEmbed: boolean,
	db: Settings
) {
	const autoRole = db.get(interaction.guild!.id, "autoRole");
	if (!autoRole) return;
	try {
		let guildMember = interaction.guild!.members.cache.get(member);
		if (!guildMember) {
			//Use the fetch in case the member is not in the cache
			guildMember = await interaction.guild!.members.fetch(member);
		}
		//fetch role
		const diceRole = await fetchDiceRole(diceEmbed, interaction.guild!, autoRole.dice);
		const statsRole = await fetchStatsRole(
			statsEmbed,
			interaction.guild!,
			autoRole.stats
		);

		if (diceEmbed && diceRole) await guildMember.roles.add(diceRole);

		if (statsEmbed && statsRole) await guildMember.roles.add(statsRole);
	} catch (e) {
		console.error("\nError while adding role", e);
		//delete the role from database so it will be skip next time
		db.delete(interaction.guild!.id, "autoRole");
		const dbLogs = db.get(interaction.guild!.id, "logs");
		const errorMessage = `\`\`\`\n${(e as Error).message}\n\`\`\``;
		if (dbLogs) {
			const logs = await fetchChannel(interaction.guild!, dbLogs);
			if (logs?.type === Djs.ChannelType.GuildText) {
				await logs.send(errorMessage);
			}
		} else {
			//Dm the server owner because it's pretty important to know
			const owner = await interaction.guild!.fetchOwner();
			await owner.send(errorMessage);
		}
	}
}
