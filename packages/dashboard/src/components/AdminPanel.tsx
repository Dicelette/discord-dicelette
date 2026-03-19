import type { GuildBotConfig, TemplateConfig } from "../types";
import { SectionHeader } from "./SectionHeader";

function splitCsv(value: string) {
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

export function AdminPanel(props: {
	config: GuildBotConfig;
	onUpdateConfig: <K extends keyof GuildBotConfig>(
		key: K,
		value: GuildBotConfig[K]
	) => void;
	onUpdateTemplate: <K extends keyof TemplateConfig>(
		key: K,
		value: TemplateConfig[K]
	) => void;
	onSave: () => Promise<void>;
	saving: boolean;
}) {
	const { config } = props;
	return (
		<section className="card section-block">
			<SectionHeader
				eyebrow="Vue administrateur"
				title="Paramétrage du bot sur le serveur"
				description="Configuration serveur basée sur GuildData et les commandes d'administration déjà présentes."
			/>
			<div className="form-grid">
				<label>
					<span>Langue</span>
					<select
						value={config.lang}
						onChange={(event) =>
							props.onUpdateConfig("lang", event.target.value as "fr" | "en-US")
						}
					>
						<option value="fr">Français</option>
						<option value="en-US">English (US)</option>
					</select>
				</label>
				<label>
					<span>Canal de logs</span>
					<input
						value={config.logs ?? ""}
						onChange={(event) => props.onUpdateConfig("logs", event.target.value)}
					/>
				</label>
				<label>
					<span>Canal de résultats</span>
					<input
						value={config.rollChannel ?? ""}
						onChange={(event) => props.onUpdateConfig("rollChannel", event.target.value)}
					/>
				</label>
				<label>
					<span>Canal des fiches</span>
					<input
						value={config.managerId ?? ""}
						onChange={(event) => props.onUpdateConfig("managerId", event.target.value)}
					/>
				</label>
				<label>
					<span>Canal fiches privées</span>
					<input
						value={config.privateChannel ?? ""}
						onChange={(event) =>
							props.onUpdateConfig("privateChannel", event.target.value)
						}
					/>
				</label>
				<label>
					<span>Hidden roll</span>
					<input
						value={typeof config.hiddenRoll === "string" ? config.hiddenRoll : ""}
						onChange={(event) => props.onUpdateConfig("hiddenRoll", event.target.value)}
						placeholder="#mj-secret ou vide"
					/>
				</label>
				<label>
					<span>Suppression auto (secondes)</span>
					<input
						type="number"
						value={config.deleteAfter}
						onChange={(event) =>
							props.onUpdateConfig("deleteAfter", Number(event.target.value))
						}
					/>
				</label>
				<label>
					<span>Pity threshold</span>
					<input
						type="number"
						value={config.pity ?? 0}
						onChange={(event) =>
							props.onUpdateConfig("pity", Number(event.target.value) || undefined)
						}
					/>
				</label>
				<label>
					<span>Ordre de tri</span>
					<select
						value={config.sortOrder}
						onChange={(event) =>
							props.onUpdateConfig(
								"sortOrder",
								event.target.value as GuildBotConfig["sortOrder"]
							)
						}
					>
						<option value="none">Aucun</option>
						<option value="asc">Ascendant</option>
						<option value="desc">Descendant</option>
					</select>
				</label>
			</div>

			<div className="toggle-grid">
				{[
					["disableThread", config.disableThread, "Désactiver les threads"],
					["timestamp", config.timestamp, "Ajouter un timestamp"],
					["context", config.context, "Afficher le contexte"],
					["linkToLogs", config.linkToLogs, "Lien vers les logs"],
					["allowSelfRegister", config.allowSelfRegister, "Autoriser l'auto-inscription"],
				].map(([key, value, label]) => (
					<label className="toggle" key={String(key)}>
						<input
							type="checkbox"
							checked={Boolean(value)}
							onChange={(event) =>
								props.onUpdateConfig(
									key as keyof GuildBotConfig,
									event.target.checked as never
								)
							}
						/>
						<span>{label}</span>
					</label>
				))}
			</div>

			<div className="subsection-grid">
				<div className="sub-card">
					<h3>Template de serveur</h3>
					<label>
						<span>Stats</span>
						<input
							value={config.templateID.statsName.join(", ")}
							onChange={(event) =>
								props.onUpdateTemplate("statsName", splitCsv(event.target.value))
							}
						/>
					</label>
					<label>
						<span>Stats exclues</span>
						<input
							value={config.templateID.excludedStats.join(", ")}
							onChange={(event) =>
								props.onUpdateTemplate("excludedStats", splitCsv(event.target.value))
							}
						/>
					</label>
					<label>
						<span>Entrées de dommages</span>
						<input
							value={config.templateID.damageName.join(", ")}
							onChange={(event) =>
								props.onUpdateTemplate("damageName", splitCsv(event.target.value))
							}
						/>
					</label>
				</div>
				<div className="sub-card">
					<h3>Gestion des rôles</h3>
					<label>
						<span>Rôle auto - dés</span>
						<input
							value={config.autoRole.dice ?? ""}
							onChange={(event) =>
								props.onUpdateConfig("autoRole", {
									...config.autoRole,
									dice: event.target.value,
								})
							}
						/>
					</label>
					<label>
						<span>Rôle auto - statistiques</span>
						<input
							value={config.autoRole.stats ?? ""}
							onChange={(event) =>
								props.onUpdateConfig("autoRole", {
									...config.autoRole,
									stats: event.target.value,
								})
							}
						/>
					</label>
					<p className="helper-copy">
						Les sauvegardes de cette section utilisent l'API dashboard pour persister la
						configuration serveur dans Enmap.
					</p>
				</div>
				<div className="sub-card wide">
					<h3>Routage hors RP</h3>
					<div className="form-grid compact">
						<label>
							<span>Regex</span>
							<input
								value={config.stripOOC.regex}
								onChange={(event) =>
									props.onUpdateConfig("stripOOC", {
										...config.stripOOC,
										regex: event.target.value,
									})
								}
							/>
						</label>
						<label>
							<span>Forward</span>
							<input
								value={config.stripOOC.forwardId}
								onChange={(event) =>
									props.onUpdateConfig("stripOOC", {
										...config.stripOOC,
										forwardId: event.target.value,
									})
								}
							/>
						</label>
						<label>
							<span>Catégories</span>
							<input
								value={config.stripOOC.categoryId.join(", ")}
								onChange={(event) =>
									props.onUpdateConfig("stripOOC", {
										...config.stripOOC,
										categoryId: splitCsv(event.target.value),
									})
								}
							/>
						</label>
					</div>
				</div>
			</div>
			<div className="actions-row">
				<button
					className="primary-action"
					onClick={() => void props.onSave()}
					type="button"
				>
					{props.saving ? "Sauvegarde…" : "Sauvegarder la configuration"}
				</button>
			</div>
		</section>
	);
}
