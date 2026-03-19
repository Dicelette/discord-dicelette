import type { AttributeRecord, SnippetRecord } from "../types";
import { SectionHeader } from "./SectionHeader";

export function UserPanel(props: {
	snippets: SnippetRecord;
	attributes: AttributeRecord;
	snippetDraft: { key: string; value: string };
	attributeDraft: { key: string; value: string };
	onSnippetDraftChange: (draft: { key: string; value: string }) => void;
	onAttributeDraftChange: (draft: { key: string; value: string }) => void;
	onSaveSnippet: () => void;
	onSaveAttribute: () => void;
	onPersist: () => Promise<void>;
	saving: boolean;
}) {
	return (
		<section className="card section-block">
			<SectionHeader
				eyebrow="Vue utilisateur"
				title="Snippets et attributs"
				description="Seules les fonctions autorisées aux utilisateurs standards sont visibles ici."
			/>
			<div className="subsection-grid user-panels">
				<div className="sub-card">
					<h3>Snippets</h3>
					<div className="collection-list">
						{Object.entries(props.snippets).map(([key, value]) => (
							<div className="collection-row" key={key}>
								<strong>{key}</strong>
								<code>{value}</code>
							</div>
						))}
					</div>
					<div className="inline-form">
						<input
							placeholder="Nom du snippet"
							value={props.snippetDraft.key}
							onChange={(event) =>
								props.onSnippetDraftChange({
									...props.snippetDraft,
									key: event.target.value,
								})
							}
						/>
						<input
							placeholder="Expression"
							value={props.snippetDraft.value}
							onChange={(event) =>
								props.onSnippetDraftChange({
									...props.snippetDraft,
									value: event.target.value,
								})
							}
						/>
						<button onClick={props.onSaveSnippet} type="button">
							Ajouter
						</button>
					</div>
				</div>

				<div className="sub-card">
					<h3>Attributs</h3>
					<div className="collection-list">
						{Object.entries(props.attributes).map(([key, value]) => (
							<div className="collection-row" key={key}>
								<strong>{key}</strong>
								<code>{String(value)}</code>
							</div>
						))}
					</div>
					<div className="inline-form">
						<input
							placeholder="Nom de l'attribut"
							value={props.attributeDraft.key}
							onChange={(event) =>
								props.onAttributeDraftChange({
									...props.attributeDraft,
									key: event.target.value,
								})
							}
						/>
						<input
							type="number"
							placeholder="Valeur"
							value={props.attributeDraft.value}
							onChange={(event) =>
								props.onAttributeDraftChange({
									...props.attributeDraft,
									value: event.target.value,
								})
							}
						/>
						<button onClick={props.onSaveAttribute} type="button">
							Ajouter
						</button>
					</div>
				</div>
			</div>
			<div className="actions-row">
				<button
					className="primary-action"
					onClick={() => void props.onPersist()}
					type="button"
				>
					{props.saving ? "Sauvegarde…" : "Enregistrer snippets et attributs"}
				</button>
			</div>
		</section>
	);
}
