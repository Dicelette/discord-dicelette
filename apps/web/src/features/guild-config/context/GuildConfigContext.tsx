import type { ApiGuildData, TemplateResult } from "@dicelette/types";
import type { Channel, Role } from "@shared";
import { createContext, type ReactNode, useCallback, useMemo } from "react";
import { useTemplateState } from "../../user-config/hooks";

export interface GuildConfigContextType {
	config: ApiGuildData;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
	saving: boolean;
	saveSuccess?: boolean;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	templateState: ReturnType<typeof useTemplateState>;
}

export const GuildConfigContext = createContext<GuildConfigContextType | undefined>(
	undefined
);

interface GuildConfigProviderProps {
	config: ApiGuildData;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
	saving: boolean;
	saveSuccess?: boolean;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	children: ReactNode;
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
		[config, channels, roles, isStrictAdmin, saving, saveSuccess, onSave, templateState]
	);

	return (
		<GuildConfigContext.Provider value={value}>{children}</GuildConfigContext.Provider>
	);
}
