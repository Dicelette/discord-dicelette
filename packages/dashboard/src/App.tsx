import { AdminPanel } from "./components/AdminPanel";
import { HeroHeader } from "./components/HeroHeader";
import { OverviewPanel } from "./components/OverviewPanel";
import { Sidebar } from "./components/Sidebar";
import { UserPanel } from "./components/UserPanel";
import { useDashboardState } from "./hooks/useDashboardState";

const oauthScopes = ["identify", "guilds"];

export function App() {
	const dashboard = useDashboardState();
	const isAdmin = dashboard.access.includes("admin");
	const isUser = dashboard.access.includes("user");

	return (
		<div className="app-shell">
			<div className="ambient ambient-a" />
			<div className="ambient ambient-b" />
			<HeroHeader
				user={dashboard.state.user}
				oauthScopes={oauthScopes}
				onConnect={() => void dashboard.onConnect()}
				status={dashboard.status}
			/>

			<main className="dashboard-grid">
				<Sidebar
					guilds={dashboard.state.guilds}
					selectedGuildId={dashboard.selectedGuildId}
					onSelectGuild={dashboard.setSelectedGuildId}
					access={dashboard.access}
				/>

				<section className="content-column">
					{dashboard.selectedGuild && dashboard.currentConfig ? (
						<>
							<OverviewPanel
								guild={dashboard.selectedGuild}
								config={dashboard.currentConfig}
								snippets={dashboard.currentSnippets}
								attributes={dashboard.currentAttributes}
							/>

							{isAdmin ? (
								<AdminPanel
									config={dashboard.currentConfig}
									onUpdateConfig={dashboard.updateConfig}
									onUpdateTemplate={dashboard.updateTemplate}
									onSave={dashboard.persistConfig}
									saving={dashboard.savingConfig}
								/>
							) : null}

							{isUser ? (
								<UserPanel
									snippets={dashboard.currentSnippets}
									attributes={dashboard.currentAttributes}
									snippetDraft={dashboard.snippetDraft}
									attributeDraft={dashboard.attributeDraft}
									onSnippetDraftChange={dashboard.setSnippetDraft}
									onAttributeDraftChange={dashboard.setAttributeDraft}
									onSaveSnippet={dashboard.saveSnippetDraft}
									onSaveAttribute={dashboard.saveAttributeDraft}
									onPersist={dashboard.persistUserSettings}
									saving={dashboard.savingUserSettings}
								/>
							) : null}
						</>
					) : (
						<section className="card section-block empty-state">
							<h2>Aucun serveur sélectionné</h2>
							<p>Connecte-toi avec Discord puis sélectionne un serveur pour commencer.</p>
						</section>
					)}
				</section>
			</main>
		</div>
	);
}
