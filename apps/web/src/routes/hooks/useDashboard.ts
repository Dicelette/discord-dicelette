import { type ApiUserConfig, charactersApi, guildApi } from "@dicelette/api";
import type { ApiGuildData } from "@dicelette/types";
import { type Channel, type Role, useI18n } from "@shared";
import { startTransition, useCallback, useEffect, useReducer, useRef } from "react";

const DASHBOARD_LOAD_DEBOUNCE_MS = 150;
const DASHBOARD_CACHE_TTL_MS = 20_000;

interface DashboardCacheEntry {
	expiresAt: number;
	data: {
		isAdmin: boolean;
		isStrictAdmin: boolean;
		userCharCount: number;
		userConfigData: ApiUserConfig["userConfig"];
		serverCharCount: number;
		config: ApiGuildData | null;
		channels: Channel[];
		roles: Role[];
	};
}

const dashboardClientCache = new Map<string, DashboardCacheEntry>();

function getInitialTab(admin: boolean, userCharCount: number): ActiveTab {
	if (admin) return "admin";
	return userCharCount > 0 ? "characters" : "user";
}

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

type Action =
	| {
			type: "user_loaded";
			isAdmin: boolean;
			isStrictAdmin: boolean;
			userCharCount: number;
			userConfigData: ApiUserConfig["userConfig"];
			tab: ActiveTab;
	  }
	| { type: "config_loaded"; config: ApiGuildData }
	| { type: "set_channels"; channels: Channel[] }
	| { type: "set_roles"; roles: Role[] }
	| { type: "set_server_char_count"; count: number }
	| { type: "set_loading"; value: boolean }
	| { type: "set_error"; value: string | null }
	| { type: "set_saving"; value: boolean }
	| { type: "set_save_success"; value: boolean }
	| { type: "set_refreshing"; value: boolean }
	| { type: "set_refresh_success"; value: boolean }
	| { type: "increment_refresh_token" }
	| { type: "update_config"; updates: Partial<ApiGuildData> }
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
		case "config_loaded":
			return { ...state, config: action.config };
		case "set_channels":
			return { ...state, channels: action.channels };
		case "set_roles":
			return { ...state, roles: action.roles };
		case "set_server_char_count":
			return { ...state, serverCharCount: action.count };
		case "set_loading":
			return { ...state, loading: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "set_saving":
			return { ...state, saving: action.value };
		case "set_save_success":
			return { ...state, saveSuccess: action.value };
		case "set_refreshing":
			return { ...state, refreshingCharacters: action.value };
		case "set_refresh_success":
			return { ...state, refreshSuccess: action.value };
		case "increment_refresh_token":
			return { ...state, charactersRefreshToken: state.charactersRefreshToken + 1 };
		case "update_config":
			return {
				...state,
				config: state.config ? { ...state.config, ...action.updates } : state.config,
			};
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
		const cached = dashboardClientCache.get(guildId);
		if (cached && Date.now() < cached.expiresAt) {
			const {
				isAdmin,
				isStrictAdmin,
				userCharCount,
				userConfigData,
				serverCharCount,
				config,
				channels,
				roles,
			} = cached.data;
			dispatch({
				type: "user_loaded",
				isAdmin,
				isStrictAdmin,
				userCharCount,
				userConfigData,
				tab: getInitialTab(isAdmin, userCharCount),
			});
			if (config) dispatch({ type: "config_loaded", config });
			dispatch({ type: "set_channels", channels });
			dispatch({ type: "set_roles", roles });
			dispatch({ type: "set_server_char_count", count: serverCharCount });
			dispatch({ type: "set_error", value: null });
			dispatch({ type: "set_loading", value: false });
			return;
		}

		dispatch({ type: "set_loading", value: true });
		dispatch({ type: "set_error", value: null });

		const controller = new AbortController();
		const { signal } = controller;
		let isActive = true;

		const loadGuildDashboard = async () => {
			try {
				const bootstrapRes = await guildApi.getDashboardBootstrap(guildId, { signal });

				if (!isActive || signal.aborted) return;

				const {
					isAdmin,
					isStrictAdmin,
					userConfig,
					userCharCount,
					serverCharCount,
					config,
					channels,
					roles,
				} = bootstrapRes.data;
				const admin = isAdmin;
				const strictAdmin = isStrictAdmin;
				const nextUserCharCount = userCharCount;
				const nextServerCharCount = admin ? serverCharCount : 0;
				const nextConfig = admin ? config : null;
				const nextChannels = admin ? channels : [];
				const nextRoles = admin ? roles : [];
				const initialTab: ActiveTab = getInitialTab(admin, nextUserCharCount);

				dispatch({
					type: "user_loaded",
					isAdmin: admin,
					isStrictAdmin: strictAdmin,
					userCharCount: nextUserCharCount,
					userConfigData: userConfig,
					tab: initialTab,
				});

				dashboardClientCache.set(guildId, {
					expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
					data: {
						isAdmin: admin,
						isStrictAdmin: strictAdmin,
						userCharCount: nextUserCharCount,
						userConfigData: userConfig,
						serverCharCount: nextServerCharCount,
						config: nextConfig,
						channels: nextChannels,
						roles: nextRoles,
					},
				});

				dispatch({ type: "set_server_char_count", count: nextServerCharCount });
				dispatch({ type: "set_channels", channels: nextChannels });
				dispatch({ type: "set_roles", roles: nextRoles });
				if (nextConfig) {
					dispatch({ type: "config_loaded", config: nextConfig });
				}
			} catch {
				if (!isActive || signal.aborted) return;
				dispatch({ type: "set_error", value: tRef.current("dashboard.loadError") });
			} finally {
				if (isActive && !signal.aborted) {
					dispatch({ type: "set_loading", value: false });
				}
			}
		};

		const timeoutId = setTimeout(loadGuildDashboard, DASHBOARD_LOAD_DEBOUNCE_MS);

		return () => {
			isActive = false;
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [guildId]); // `t` removed — tRef always holds the current translator

	const handleSave = useCallback(
		async (updates: Partial<ApiGuildData>) => {
			if (!guildId) return;
			dispatch({ type: "set_saving", value: true });
			dispatch({ type: "set_save_success", value: false });
			try {
				await guildApi.updateConfig(guildId, updates);
				dispatch({ type: "update_config", updates });
				const cached = dashboardClientCache.get(guildId);
				if (cached?.data.config) {
					dashboardClientCache.set(guildId, {
						...cached,
						expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
						data: {
							...cached.data,
							config: { ...cached.data.config, ...updates },
						},
					});
				}
				dispatch({ type: "set_save_success", value: true });
				setTimeout(() => dispatch({ type: "set_save_success", value: false }), 3000);
			} catch {
				dispatch({ type: "set_error", value: tRef.current("dashboard.saveError") });
			} finally {
				dispatch({ type: "set_saving", value: false });
			}
		},
		[guildId]
	);

	const refetchConfig = useCallback(async () => {
		if (!guildId) return;
		try {
			const res = await guildApi.getConfig(guildId);
			dispatch({ type: "config_loaded", config: res.data });
			const cached = dashboardClientCache.get(guildId);
			if (cached) {
				dashboardClientCache.set(guildId, {
					...cached,
					expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
					data: { ...cached.data, config: res.data },
				});
			}
		} catch {
			// silent — the template tab shows its own errors
		}
	}, [guildId]);

	const handleCharactersRefresh = useCallback(async () => {
		if (!guildId) return;
		dispatch({ type: "set_refreshing", value: true });
		dispatch({ type: "set_error", value: null });
		dispatch({ type: "set_refresh_success", value: false });
		try {
			await charactersApi.refreshDashboard(guildId);
			dashboardClientCache.delete(guildId);
			dispatch({ type: "increment_refresh_token" });
			dispatch({ type: "set_refresh_success", value: true });
			setTimeout(() => dispatch({ type: "set_refresh_success", value: false }), 3000);
		} catch {
			dispatch({
				type: "set_error",
				value: tRef.current("dashboard.refreshCharactersError"),
			});
		} finally {
			dispatch({ type: "set_refreshing", value: false });
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
		dispatch({ type: "set_refresh_success", value });
	}, []);

	return {
		...state,
		setError,
		setRefreshSuccess,
		setHasUnsavedChanges,
		handleSave,
		handleCharactersRefresh,
		handleTabChange,
		refetchConfig,
	};
}
