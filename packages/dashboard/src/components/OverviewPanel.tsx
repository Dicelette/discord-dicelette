import type {
	AttributeRecord,
	GuildBotConfig,
	GuildSummary,
	SnippetRecord,
} from "../types";
import { KeyValue } from "./KeyValue";
import { SectionHeader } from "./SectionHeader";

function formatChannel(value?: string | boolean) {
	if (typeof value === "boolean") return value ? "Activé" : "Désactivé";
	return value && value.length > 0 ? value : "Non défini";
}

export function OverviewPanel(props: {
	guild: GuildSummary;
	config: GuildBotConfig;
	snippets: SnippetRecord;
	attributes: AttributeRecord;
}) {
	return (
		<>
			<section className="card section-block">
				<SectionHeader
					eyebrow="Serveur actif"
					title={props.guild.name}
					description="Synthèse de la configuration dérivée de la structure actuelle du bot."
				/>
				<div className="stats-grid">
					<KeyValue label="Langue" value={props.config.lang} />
					<KeyValue
						label="Template message"
						value={`${props.config.templateID.channelId} / ${props.config.templateID.messageId}`}
					/>
					<KeyValue
						label="Stats détectées"
						value={props.config.templateID.statsName.join(", ")}
					/>
					<KeyValue
						label="Dommages / snippets système"
						value={props.config.templateID.damageName.join(", ")}
					/>
				</div>
			</section>

			<section className="card section-block">
				<SectionHeader
					eyebrow="Préparation API"
					title="Contrat de données prévu"
					description="Le dashboard lit et écrit les réglages via l'API Express du bot, qui persiste dans Enmap quand elle est disponible."
				/>
				<div className="stats-grid">
					<KeyValue label="logs" value={formatChannel(props.config.logs)} />
					<KeyValue label="rollChannel" value={formatChannel(props.config.rollChannel)} />
					<KeyValue label="hiddenRoll" value={formatChannel(props.config.hiddenRoll)} />
					<KeyValue
						label="autoRole"
						value={`${props.config.autoRole.dice ?? "-"} / ${props.config.autoRole.stats ?? "-"}`}
					/>
				</div>
				<pre className="json-preview">
					{JSON.stringify(
						{
							guildId: props.guild.id,
							config: props.config,
							userSettings: {
								snippets: props.snippets,
								attributes: props.attributes,
							},
						},
						null,
						2
					)}
				</pre>
			</section>
		</>
	);
}
