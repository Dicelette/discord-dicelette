import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { useI18n } from "../../../shared/i18n";
import { useConfigForm } from "../../../shared/hooks/useConfigForm";
import type { Channel } from "../types";
import ChannelsSection from "./atoms/ChannelsSection";
import ConfigFormFooter from "./atoms/ConfigFormFooter";
import DiceBehaviourSection from "./sections/DiceBehaviourSection";
import GeneralSection from "./sections/GeneralSection";
import ResultsSection from "./sections/ResultsSection";
import StripOOCSection from "./sections/StripOOCSection";

interface Props {
	config: ApiGuildData;
	guildId: string;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
}

export default function GuildConfigForm({ config, onSave, saving, channels }: Props) {
	const { t } = useI18n();
	const { control, handleSubmit, isDirty, reset, textChannels } = useConfigForm(
		config,
		channels
	);

	const handleSaveAndReset = async (data: ApiGuildData) => {
		await onSave(data);
		reset(data);
	};

	return (
		<Stack spacing={2}>
			{isDirty && <Alert severity="warning">{t("config.unsaved")}</Alert>}

			<Box component="form" onSubmit={handleSubmit(handleSaveAndReset)}>
				<Stack spacing={2}>
					<Paper sx={{ p: 3 }} title={t("config.sections.general")}>
						<GeneralSection control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<ChannelsSection
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<ResultsSection
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
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
