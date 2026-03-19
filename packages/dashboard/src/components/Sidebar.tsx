import type { AccessLevel, GuildSummary } from "../types";
import { SectionHeader } from "./SectionHeader";

const roleDescriptions: Record<AccessLevel, string> = {
	admin:
		"Accès à toute la configuration du bot sur le serveur : template, logs, rôles automatiques, affichage et permissions.",
	user: "Accès limité aux snippets et aux attributs personnels, sans exposition des réglages sensibles du serveur.",
};

export function Sidebar(props: {
	guilds: GuildSummary[];
	selectedGuildId: string;
	onSelectGuild: (guildId: string) => void;
	access: AccessLevel[];
}) {
	return (
		<aside className="sidebar card">
			<SectionHeader
				eyebrow="Étape 1"
				title="Serveurs détectés"
				description="Les guilds récupérées après OAuth2 sont listées ici."
			/>
			<div className="guild-list">
				{props.guilds.map((guild) => {
					const active = guild.id === props.selectedGuildId;
					return (
						<button
							className={active ? "guild-item active" : "guild-item"}
							onClick={() => props.onSelectGuild(guild.id)}
							type="button"
							key={guild.id}
						>
							<div className="guild-icon">{guild.icon}</div>
							<div>
								<strong>{guild.name}</strong>
								<span>{guild.memberCount} membres</span>
								<small>{guild.roleLabel}</small>
							</div>
						</button>
					);
				})}
			</div>

			<SectionHeader
				eyebrow="Étape 2"
				title="Contrôle d'accès"
				description="La vue change selon les permissions du membre sur le serveur."
			/>
			<div className="role-stack">
				{(["admin", "user"] as const).map((role) => (
					<div className="role-card" key={role}>
						<div className="role-title-row">
							<strong>{role === "admin" ? "Administrateur" : "Utilisateur"}</strong>
							<span
								className={props.access.includes(role) ? "badge success" : "badge muted"}
							>
								{props.access.includes(role) ? "Autorisé" : "Masqué"}
							</span>
						</div>
						<p>{roleDescriptions[role]}</p>
					</div>
				))}
			</div>
		</aside>
	);
}
