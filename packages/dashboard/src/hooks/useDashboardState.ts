import { useMemo, useState } from "react";
import { fetchBootstrap, saveGuildConfig, saveUserSettings } from "../api/dashboardApi";
import { DEMO_STATE } from "../data/demoData";
import type {
	AccessLevel,
	DashboardState,
	GuildBotConfig,
	TemplateConfig,
} from "../types";

const DEFAULT_USER_ID = DEMO_STATE.user.id;

export function useDashboardState() {
	const [state, setState] = useState<DashboardState>(DEMO_STATE);
	const [selectedGuildId, setSelectedGuildId] = useState(DEMO_STATE.guilds[0]?.id ?? "");
	const [snippetDraft, setSnippetDraft] = useState({ key: "", value: "" });
	const [attributeDraft, setAttributeDraft] = useState({ key: "", value: "0" });
	const [status, setStatus] = useState(
		"Mode démo actif. Connecte Discord puis branche l'API du bot pour persister via Enmap."
	);
	const [savingConfig, setSavingConfig] = useState(false);
	const [savingUserSettings, setSavingUserSettings] = useState(false);

	const selectedGuild = state.guilds.find((guild) => guild.id === selectedGuildId);
	const currentConfig = selectedGuild ? state.configByGuild[selectedGuild.id] : undefined;
	const currentSnippets = selectedGuild
		? (state.snippetsByGuild[selectedGuild.id] ?? {})
		: {};
	const currentAttributes = selectedGuild
		? (state.attributesByGuild[selectedGuild.id] ?? {})
		: {};
	const access = useMemo<AccessLevel[]>(
		() => selectedGuild?.permissions ?? [],
		[selectedGuild]
	);

	const onConnect = async () => {
		setState((prev) => ({
			...prev,
			user: {
				...prev.user,
				connected: true,
			},
		}));
		try {
			const bootstrap = await fetchBootstrap(state.user.id || DEFAULT_USER_ID);
			setState((prev) => ({
				...prev,
				user: { ...bootstrap.user, connected: true },
				guilds: bootstrap.guilds,
				configByGuild: bootstrap.configByGuild,
				snippetsByGuild: Object.fromEntries(
					Object.entries(bootstrap.userSettingsByGuild).map(([guildId, data]) => [
						guildId,
						data.snippets,
					])
				),
				attributesByGuild: Object.fromEntries(
					Object.entries(bootstrap.userSettingsByGuild).map(([guildId, data]) => [
						guildId,
						data.attributes,
					])
				),
			}));
			setSelectedGuildId((prev) => prev || bootstrap.guilds[0]?.id || "");
			setStatus(
				"Données chargées depuis l'API dashboard du bot et persistées via Enmap."
			);
		} catch {
			setStatus(
				"API dashboard indisponible : le prototype reste utilisable en mode démo local."
			);
		}
	};

	const updateConfig = <K extends keyof GuildBotConfig>(
		key: K,
		value: GuildBotConfig[K]
	) => {
		if (!selectedGuild) return;
		setState((prev) => ({
			...prev,
			configByGuild: {
				...prev.configByGuild,
				[selectedGuild.id]: {
					...prev.configByGuild[selectedGuild.id],
					[key]: value,
				},
			},
		}));
	};

	const updateTemplate = <K extends keyof TemplateConfig>(
		key: K,
		value: TemplateConfig[K]
	) => {
		if (!selectedGuild) return;
		setState((prev) => ({
			...prev,
			configByGuild: {
				...prev.configByGuild,
				[selectedGuild.id]: {
					...prev.configByGuild[selectedGuild.id],
					templateID: {
						...prev.configByGuild[selectedGuild.id].templateID,
						[key]: value,
					},
				},
			},
		}));
	};

	const saveSnippetDraft = () => {
		if (!selectedGuild || !snippetDraft.key || !snippetDraft.value) return;
		setState((prev) => ({
			...prev,
			snippetsByGuild: {
				...prev.snippetsByGuild,
				[selectedGuild.id]: {
					...prev.snippetsByGuild[selectedGuild.id],
					[snippetDraft.key]: snippetDraft.value,
				},
			},
		}));
		setSnippetDraft({ key: "", value: "" });
	};

	const saveAttributeDraft = () => {
		if (!selectedGuild || !attributeDraft.key) return;
		const numericValue = Number(attributeDraft.value);
		if (Number.isNaN(numericValue)) return;
		setState((prev) => ({
			...prev,
			attributesByGuild: {
				...prev.attributesByGuild,
				[selectedGuild.id]: {
					...prev.attributesByGuild[selectedGuild.id],
					[attributeDraft.key]: numericValue,
				},
			},
		}));
		setAttributeDraft({ key: "", value: "0" });
	};

	const persistConfig = async () => {
		if (!selectedGuild || !currentConfig) return;
		setSavingConfig(true);
		try {
			const payload = await saveGuildConfig(
				selectedGuild.id,
				currentConfig,
				state.user.id
			);
			setState((prev) => ({
				...prev,
				configByGuild: {
					...prev.configByGuild,
					[selectedGuild.id]: payload.config,
				},
			}));
			setStatus(`Configuration de ${selectedGuild.name} sauvegardée dans Enmap.`);
		} catch {
			setStatus(
				"Sauvegarde distante indisponible : la configuration reste modifiée localement dans le prototype."
			);
		} finally {
			setSavingConfig(false);
		}
	};

	const persistUserSettings = async () => {
		if (!selectedGuild) return;
		setSavingUserSettings(true);
		try {
			const payload = await saveUserSettings(selectedGuild.id, state.user.id, {
				snippets: currentSnippets,
				attributes: currentAttributes,
			});
			setState((prev) => ({
				...prev,
				snippetsByGuild: {
					...prev.snippetsByGuild,
					[selectedGuild.id]: payload.userSettings.snippets,
				},
				attributesByGuild: {
					...prev.attributesByGuild,
					[selectedGuild.id]: payload.userSettings.attributes,
				},
			}));
			setStatus(`Snippets et attributs de ${selectedGuild.name} sauvegardés dans Enmap.`);
		} catch {
			setStatus(
				"Sauvegarde distante indisponible : les snippets et attributs restent modifiés localement."
			);
		} finally {
			setSavingUserSettings(false);
		}
	};

	return {
		state,
		selectedGuild,
		selectedGuildId,
		setSelectedGuildId,
		currentConfig,
		currentSnippets,
		currentAttributes,
		access,
		snippetDraft,
		setSnippetDraft,
		attributeDraft,
		setAttributeDraft,
		status,
		savingConfig,
		savingUserSettings,
		onConnect,
		updateConfig,
		updateTemplate,
		saveSnippetDraft,
		saveAttributeDraft,
		persistConfig,
		persistUserSettings,
	};
}
