import type { StatisticalTemplate } from "@dicelette/core";

export interface ImportTemplateData {
	template: StatisticalTemplate;
	channelId: string;
	publicChannelId?: string;
	privateChannelId?: string;
	deleteCharacters: boolean;
	updateCharacters?: boolean;
}
