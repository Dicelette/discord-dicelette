import { type ApiUserConfig, charactersApi, guildApi, userApi } from "@dicelette/api";
import type { ApiGuildData } from "@dicelette/types";
import { type Channel, type Role, useI18n } from "@shared";
import { startTransition, useCallback, useEffect, useReducer, useRef } from "react";

export type ActiveTab =
	| "admin"
	| "template"
	| "user"
	| "characters"
	| "server-characters";

interface State {
	tab: ActiveTab;
	mountedTabs: Set<ActiveTab>;
	isAdmin: boolean;
	isStrictAdmin: boolean;
	userCharCount: number;
	serverCharCount: number;
	config: ApiGuildData | null;
	userConfigData: ApiUserConfig["userConfig"];
	loading: boolean;
	error: string | null;
	saving: boolean;
	saveSuccess: boolean;
	refreshingCharacters: boolean;
	refreshSuccess: boolean;
	charactersRefreshToken: number;
	channels: Channel[];
	roles: Role[];
	hasUnsavedChanges: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────
// Each action represents a complete state transition, not a granular setter.

type Action =
	// Initial data load
	| {
			type: "user_loaded";
			isAdmin: boolean;
			isStrictAdmin: boolean;
			userCharCount: number;
			userConfigData: ApiUserConfig["userConfig"];
			tab: ActiveTab;
	  }
	| {
			type: "admin_data_loaded";
			config: ApiGuildData;
			channels: Channel[];
			roles: Role[];
			serverCharCount: number;
	  }
	| { type: "set_loading"; value: boolean }
	| { type: "set_error"; value: string | null }
	// Config save lifecycle
	| { type: "save_start" }
	| { type: "save_success"; updates: Partial<ApiGuildData> }
	| { type: "save_failed"; error: string }
	| { type: "save_clear_success" }
	// Characters refresh lifecycle
	| { type: "refresh_start" }
	| { type: "refresh_success" }
	| { type: "refresh_failed"; error: string }
	| { type: "refresh_clear_success" }
	// Navigation
	| { type: "mount_tab"; tab: ActiveTab }
	| { type: "set_tab"; tab: ActiveTab }
	| { type: "set_dirty"; value: boolean };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "user_loaded":
			return {
				...state,
				isAdmin: action.isAdmin,
				isStrictAdmin: action.isStrictAdmin,
				userCharCount: action.userCharCount,
				userConfigData: action.userConfigData,
				tab: action.tab,
				mountedTabs: new Set([action.tab]),
			};
		case "admin_data_loaded":
			return {
				...state,
				config: action.config,
				channels: action.channels,
				roles: action.roles,
				serverCharCount: action.serverCharCount,
			};
		case "set_loading":
			return { ...state, loading: action.value };
		case "set_error":
			return { ...state, error: action.value };
		// Save lifecycle
		case "save_start":
			return { ...state, saving: true, saveSuccess: false };
		case "save_success":
			return {
				...state,
				saving: false,
				saveSuccess: true,
				config: state.config ? { ...state.config, ...action.updates } : state.config,
			};
		case "save_failed":
			return { ...state, saving: false, error: action.error };
		case "save_clear_success":
			return { ...state, saveSuccess: false };
		// Refresh lifecycle
		case "refresh_start":
			return { ...state, refreshingCharacters: true, refreshSuccess: false, error: null };
		case "refresh_success":
			return {
				...state,
				refreshingCharacters: false,
				refreshSuccess: true,
				charactersRefreshToken: state.charactersRefreshToken + 1,
			};
		case "refresh_failed":
			return { ...state, refreshingCharacters: false, error: action.error };
		case "refresh_clear_success":
			return { ...state, refreshSuccess: false };
		// Navigation
		case "mount_tab":
			return state.mountedTabs.has(action.tab)
				? state
				: { ...state, mountedTabs: new Set([...state.mountedTabs, action.tab]) };
		case "set_tab":
			return { ...state, tab: action.tab };
		case "set_dirty":
			return { ...state, hasUnsavedChanges: action.value };
	}
}

/**
 * Encapsulates all data-loading, permission, and action state for the Dashboard route.
 * Navigation (`useNavigate`) is intentionally kept in the component since it is
 * only used for the back-button click handler.
 */
export function useDashboard(guildId: string | undefined) {
	const { t } = useI18n();
	// Keep a stable ref to `t` so effects don't re-run on locale changes.
	// The ref is updated synchronously on every render, so error messages are
	// always translated in the current locale when they are actually dispatched.
	const tRef = useRef(t);
	tRef.current = t;

	const [state, dispatch] = useReducer(reducer, {
		tab: "admin",
		mountedTabs: new Set<ActiveTab>(["admin"]),
		isAdmin: false,
		isStrictAdmin: false,
		userCharCount: 0,
		serverCharCount: 0,
		config: null,
		userConfigData: null,
		loading: true,
		error: null,
		saving: false,
		saveSuccess: false,
		refreshingCharacters: false,
		refreshSuccess: false,
		charactersRefreshToken: 0,
		channels: [],
		roles: [],
		hasUnsavedChanges: false,
	});

	useEffect(() => {
		if (!guildId) return;
		Promise.all([
			userApi.getUserConfig(guildId),
			charactersApi.countSelf(guildId).catch(() => null),
		])
			.then(async ([userConfigRes, userCountRes]) => {
				const {
					isAdmin: admin,
					isStrictAdmin: strictAdmin,
					userConfig,
				} = userConfigRes.data;
				const nextUserCharCount = userCountRes?.data.count ?? 0;
				const hasUserCharacters = nextUserCharCount > 0;
				const initialTab: ActiveTab = admin
					? "admin"
					: hasUserCharacters
						? "characters"
						: "user";
				dispatch({
					type: "user_loaded",
					isAdmin: admin,
					isStrictAdmin: strictAdmin,
					userCharCount: nextUserCharCount,
					userConfigData: userConfig,
					tab: initialTab,
				});
				if (admin) {
					const [configRes, channelsRes, rolesRes, serverCharCount] = await Promise.all([
						guildApi.getConfig(guildId),
						guildApi.getChannels(guildId).catch(() => ({ data: [] as Channel[] })),
						guildApi.getRoles(guildId).catch(() => ({ data: [] as Role[] })),
						charactersApi
							.count(guildId)
							.then((r) => r.data.count)
							.catch(() => 0),
					]);
					dispatch({
						type: "admin_data_loaded",
						config: configRes.data,
						channels: channelsRes.data,
						roles: rolesRes.data,
						serverCharCount,
					});
				}
			})
			.catch(() =>
				dispatch({ type: "set_error", value: tRef.current("dashboard.loadError") })
			)
			.finally(() => dispatch({ type: "set_loading", value: false }));
	}, [guildId]); // `t` removed — tRef always holds the current translator

	const handleSave = useCallback(
		async (updates: Partial<ApiGuildData>) => {
			if (!guildId) return;
			dispatch({ type: "save_start" });
			try {
				await guildApi.updateConfig(guildId, updates);
				dispatch({ type: "save_success", updates });
				setTimeout(() => dispatch({ type: "save_clear_success" }), 3000);
			} catch {
				dispatch({ type: "save_failed", error: tRef.current("dashboard.saveError") });
			}
		},
		[guildId]
	);

	const handleCharactersRefresh = useCallback(async () => {
		if (!guildId) return;
		dispatch({ type: "refresh_start" });
		try {
			await charactersApi.refreshDashboard(guildId);
			dispatch({ type: "refresh_success" });
			setTimeout(() => dispatch({ type: "refresh_clear_success" }), 3000);
		} catch {
			dispatch({
				type: "refresh_failed",
				error: tRef.current("dashboard.refreshCharactersError"),
			});
		}
	}, [guildId]);

	const handleTabChange = useCallback(
		(_: unknown, v: ActiveTab) => {
			if (state.hasUnsavedChanges) return;
			dispatch({ type: "mount_tab", tab: v });
			startTransition(() => dispatch({ type: "set_tab", tab: v }));
		},
		[state.hasUnsavedChanges]
	);

	const setHasUnsavedChanges = useCallback((value: boolean) => {
		dispatch({ type: "set_dirty", value });
	}, []);

	const setError = useCallback((value: string | null) => {
		dispatch({ type: "set_error", value });
	}, []);

	const setRefreshSuccess = useCallback((value: boolean) => {
		if (!value) dispatch({ type: "refresh_clear_success" });
	}, []);

	return {
		...state,
		setError,
		setRefreshSuccess,
		setHasUnsavedChanges,
		handleSave,
		handleCharactersRefresh,
		handleTabChange,
	};
}
