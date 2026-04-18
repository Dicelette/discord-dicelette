import { charactersApi, templateApi } from "@dicelette/api";
import type { StatisticalTemplate } from "@dicelette/core";
import { useI18n } from "@shared";
import { useCallback, useEffect, useReducer } from "react";
import type { ImportTemplateData } from "../types";

const TEMPLATE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface TemplateCache {
	template: StatisticalTemplate | null;
	hasCharacters: boolean;
	expiresAt: number;
}

// Keyed by guildId so switching between guilds doesn't serve stale data.
const templateClientCache = new Map<string, TemplateCache>();

interface State {
	template: StatisticalTemplate | null;
	loading: boolean;
	error: string | null;
	success: string | null;
	saving: boolean;
	confirmDelete: boolean;
	editModalOpen: boolean;
	hasCharacters: boolean;
	templateChannelId: string | undefined;
	publicChannelId: string | undefined;
	privateChannelId: string | undefined;
}

type Action =
	| { type: "loaded"; template: StatisticalTemplate | null; hasCharacters: boolean }
	| { type: "saving"; value: boolean }
	| { type: "set_error"; value: string | null }
	| { type: "set_success"; value: string | null }
	| { type: "confirm_delete"; value: boolean }
	| { type: "edit_modal"; value: boolean }
	| { type: "bulk_deleted" }
	| {
			type: "imported";
			template: StatisticalTemplate;
			templateChannelId: string;
			publicChannelId: string | undefined;
			privateChannelId: string | undefined;
	  }
	| { type: "deleted" }
	| {
			type: "sync_channel";
			key: "templateChannelId" | "publicChannelId" | "privateChannelId";
			value: string | undefined;
	  };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "loaded":
			return {
				...state,
				loading: false,
				template: action.template,
				hasCharacters: action.hasCharacters,
			};
		case "saving":
			return { ...state, saving: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "set_success":
			return { ...state, success: action.value };
		case "confirm_delete":
			return { ...state, confirmDelete: action.value };
		case "edit_modal":
			return { ...state, editModalOpen: action.value };
		case "bulk_deleted":
			return { ...state, hasCharacters: false };
		case "imported":
			return {
				...state,
				template: action.template,
				templateChannelId: action.templateChannelId,
				publicChannelId: action.publicChannelId,
				privateChannelId: action.privateChannelId,
			};
		case "deleted":
			return { ...state, template: null };
		case "sync_channel":
			return { ...state, [action.key]: action.value };
	}
}

/**
 * Encapsulates all state and actions for the TemplateManager component.
 * Uses a reducer so that all related fields live in a single state object.
 */
export function useTemplateManager(
	guildId: string,
	defaultTemplateChannelId: string | undefined,
	defaultPublicChannelId: string | undefined,
	defaultPrivateChannelId: string | undefined,
	onTemplateChange?: () => void,
	onCharactersDeleted?: () => void
) {
	const { t } = useI18n();

	const [state, dispatch] = useReducer(reducer, {
		template: null,
		loading: true,
		error: null,
		success: null,
		saving: false,
		confirmDelete: false,
		editModalOpen: false,
		hasCharacters: false,
		templateChannelId: defaultTemplateChannelId,
		publicChannelId: defaultPublicChannelId,
		privateChannelId: defaultPrivateChannelId,
	});

	const flash = useCallback((kind: "set_error" | "set_success", message: string) => {
		dispatch({ type: kind, value: message });
		setTimeout(() => dispatch({ type: kind, value: null }), 3000);
	}, []);

	// Initial data load
	useEffect(() => {
		const cached = templateClientCache.get(guildId);
		if (cached && Date.now() < cached.expiresAt) {
			dispatch({
				type: "loaded",
				template: cached.template,
				hasCharacters: cached.hasCharacters,
			});
			return;
		}

		const controller = new AbortController();
		const { signal } = controller;

		let template: StatisticalTemplate | null = null;
		let hasCharacters = false;

		Promise.all([
			templateApi
				.get(guildId, { signal })
				.then((r) => {
					template = r.data;
				})
				.catch(() => {}),
			charactersApi
				.count(guildId, { signal })
				.then((r) => {
					hasCharacters = r.data.count > 0;
				})
				.catch(() => {}),
		]).finally(() => {
			if (!signal.aborted) {
				templateClientCache.set(guildId, {
					template,
					hasCharacters,
					expiresAt: Date.now() + TEMPLATE_CACHE_TTL,
				});
				dispatch({ type: "loaded", template, hasCharacters });
			}
		});

		return () => controller.abort();
	}, [guildId]);

	useEffect(
		() =>
			dispatch({
				type: "sync_channel",
				key: "templateChannelId",
				value: defaultTemplateChannelId,
			}),
		[defaultTemplateChannelId]
	);
	useEffect(
		() =>
			dispatch({
				type: "sync_channel",
				key: "publicChannelId",
				value: defaultPublicChannelId,
			}),
		[defaultPublicChannelId]
	);
	useEffect(
		() =>
			dispatch({
				type: "sync_channel",
				key: "privateChannelId",
				value: defaultPrivateChannelId,
			}),
		[defaultPrivateChannelId]
	);

	const handleModalImport = useCallback(
		async (data: ImportTemplateData) => {
			dispatch({ type: "saving", value: true });
			try {
				// Sequential order is intentional: characters must be deleted before
				// importing the new template so the server never sees characters
				// validated against a schema that no longer exists.
				if (data.deleteCharacters) {
					await charactersApi.bulkDelete(guildId);
					dispatch({ type: "bulk_deleted" });
					// Patch cache: template is still valid, only hasCharacters changed.
					const existing = templateClientCache.get(guildId);
					if (existing)
						templateClientCache.set(guildId, { ...existing, hasCharacters: false });
					onCharactersDeleted?.();
				}
				await templateApi.import(guildId, {
					template: data.template,
					channelId: data.channelId,
					publicChannelId: data.publicChannelId,
					privateChannelId: data.privateChannelId,
					updateCharacters: data.updateCharacters,
				});
				templateClientCache.delete(guildId);
				dispatch({
					type: "imported",
					template: data.template,
					templateChannelId: data.channelId,
					publicChannelId: data.publicChannelId || undefined,
					privateChannelId: data.privateChannelId || undefined,
				});
				onTemplateChange?.();
				flash("set_success", t("template.importSuccess"));
			} catch {
				flash("set_error", t("template.importError"));
			} finally {
				dispatch({ type: "saving", value: false });
			}
		},
		[guildId, flash, t, onTemplateChange, onCharactersDeleted]
	);

	const handleExportCharacters = useCallback(async () => {
		try {
			const res = await charactersApi.exportCsv(guildId);
			const url = URL.createObjectURL(res.data);
			const a = document.createElement("a");
			a.href = url;
			a.download = "characters.csv";
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			flash("set_error", t("template.exportCharactersError"));
		}
	}, [guildId, flash, t]);

	const handleDelete = useCallback(async () => {
		dispatch({ type: "confirm_delete", value: false });
		dispatch({ type: "saving", value: true });
		try {
			await templateApi.delete(guildId);
			templateClientCache.delete(guildId);
			dispatch({ type: "deleted" });
			onTemplateChange?.();
			flash("set_success", t("template.deleteSuccess"));
		} catch {
			flash("set_error", t("template.deleteError"));
		} finally {
			dispatch({ type: "saving", value: false });
		}
	}, [guildId, flash, t, onTemplateChange]);

	return {
		...state,
		dispatch,
		handleModalImport,
		handleExportCharacters,
		handleDelete,
	};
}
