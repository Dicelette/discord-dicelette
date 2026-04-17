import type { ApiGuildData, TemplateResult } from "@dicelette/types";
import { createContext, useContext, useMemo, useCallback } from "react";
import type { Channel, Role } from "@shared";
import { useTemplateState } from "../../user-config/hooks";

interface GuildConfigContextType {
	config: ApiGuildData;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
	saving: boolean;
	saveSuccess?: boolean;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	templateState: ReturnType<typeof useTemplateState>;
}

const GuildConfigContext = createContext<GuildConfigContextType | undefined>(undefined);

export function useGuildConfig() {
	const context = useContext(GuildConfigContext);
	if (!context) {
		throw new Error("useGuildConfig must be used within GuildConfigProvider");
	}
	return context;
}

interface GuildConfigProviderProps {
	config: ApiGuildData;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
	saving: boolean;
	saveSuccess?: boolean;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	children: React.ReactNode;
}

export function GuildConfigProvider({
	config,
	channels,
	roles,
	isStrictAdmin,
	saving,
	saveSuccess,
	onSave,
	children,
}: GuildConfigProviderProps) {
	const saveFn = useCallback(
		(template: TemplateResult) => onSave({ createLinkTemplate: template }),
		[onSave]
	);

	const templateState = useTemplateState(config.createLinkTemplate, saveFn, {
		externalValue: config.createLinkTemplate,
		errorKey: "dashboard.saveError",
	});

	const value: GuildConfigContextType = useMemo(
		() => ({
			config,
			channels,
			roles,
			isStrictAdmin,
			saving,
			saveSuccess,
			onSave,
			templateState,
		}),
		[
			config,
			channels,
			roles,
			isStrictAdmin,
			saving,
			saveSuccess,
			onSave,
			templateState,
		]
	);

	return (
		<GuildConfigContext.Provider value={value}>
			{children}
		</GuildConfigContext.Provider>
	);
}
