import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { useI18n } from "../../i18n";
import ChannelsSection from "./atoms/ChannelsSection.tsx";
import ConfigFormFooter from "./atoms/ConfigFormFooter.tsx";
import DiceBehaviourSection from "./DiceBehaviourSection";
import GeneralSection from "./GeneralSection";
import ResultsSection from "./ResultsSection";
import StripOOCSection from "./StripOOCSection";
import type { Channel } from "./types";
import { useConfigForm } from "./useConfigForm.ts";

interface Props {
	config: ApiGuildData;
	guildId: string;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
}

export default function GuildConfigForm({ config, onSave, saving, channels }: Props) {
	const { t } = useI18n();
	const { control, handleSubmit, isDirty, textChannels } = useConfigForm(
		config,
		channels
	);

	return (
		<Stack spacing={2}>
			{isDirty && <Alert severity="warning">{t("config.unsaved")}</Alert>}

			<Box component="form" onSubmit={handleSubmit(onSave)}>
				<Stack spacing={2}>
					<Paper sx={{ p: 3 }} title={t("config.sections.general")}>
						<GeneralSection control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<ChannelsSection control={control} textChannels={textChannels} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<ResultsSection control={control} textChannels={textChannels} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<DiceBehaviourSection control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<StripOOCSection
							control={control}
							channels={channels}
							textChannels={textChannels}
						/>
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} />
			</Box>
		</Stack>
	);
}
