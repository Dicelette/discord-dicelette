import type { EClient } from "@dicelette/client";
import type { GuildData, UserSettingsData } from "@dicelette/types";
import * as Djs from "discord.js";
import type { DashboardGuildSummary } from "./types";

function getDefaultGuildConfig(): GuildData {
	return {
		lang: Djs.Locale.French,
		disableThread: false,
		hiddenRoll: false,
		deleteAfter: 180,
		timestamp: false,
		context: false,
		linkToLogs: false,
		allowSelfRegister: false,
		sortOrder: undefined,
		templateID: {
			channelId: "",
			messageId: "",
			statsName: [],
			excludedStats: [],
			damageName: [],
			valid: false,
		},
		user: {},
		stripOOC: {
			regex: "",
			forwardId: "",
			threadMode: false,
			timer: 0,
			categoryId: [],
		},
	};
}

export function getGuildConfig(client: EClient, guildId: string) {
	return client.settings.get(guildId) ?? getDefaultGuildConfig();
}

export function getUserSettings(
	client: EClient,
	guildId: string,
	userId: string
): UserSettingsData {
	return (
		client.userSettings.get(guildId, userId) ?? {
			createLinkTemplate: {
				results: "{{info}} {{result}}",
				final: "[[{{stats}} {{results}}]](<{{link}}>)",
				joinResult: "; ",
				format: {
					name: "__{{stat}}__:",
					info: "{{info}} -",
					dice: "{{dice}}",
					originalDice: "{{original_dice}}",
					character: "{{character}}",
				},
			},
			snippets: {},
			attributes: {},
		}
	);
}

export function resolveAccess(
	member: Djs.GuildMember | null
): DashboardGuildSummary["permissions"] {
	if (!member) return [];
	const permissions: DashboardGuildSummary["permissions"] = ["user"];
	if (member.permissions.has(Djs.PermissionFlagsBits.ManageRoles))
		permissions.unshift("admin");
	return permissions;
}

export function toGuildSummary(
	guild: Djs.Guild,
	member: Djs.GuildMember | null
): DashboardGuildSummary {
	const permissions = resolveAccess(member);
	return {
		id: guild.id,
		name: guild.name,
		icon: guild.iconURL() ?? "🎲",
		memberCount: guild.memberCount,
		permissions,
		roleLabel: permissions.includes("admin")
			? "Administrateur · Gestion des rôles"
			: "Utilisateur",
	};
}
