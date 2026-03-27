import type { ApiGuildData } from "@dicelette/types";
import type { Control } from "react-hook-form";

export interface Channel {
	id: string;
	name: string;
	type: number;
	// biome-ignore lint/style/useNamingConvention: Say that to discord
	parent_id?: string | null;
}
export interface ConfigFormProps {
	config: ApiGuildData;
	guildId: string;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
	roles: Role[];
}

export interface Role {
	id: string;
	name: string;
	color: number;
}

export interface Props {
	guildId: string;
	channels: Channel[];
}

export interface HiddenRoleProps {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}
