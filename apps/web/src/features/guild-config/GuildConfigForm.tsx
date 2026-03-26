import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { type Channel, ConfigFormFooter, useConfigForm, useI18n } from "@shared";
import { Channels, DiceBehaviour, General, HiddenRolls, Results, StripOOC } from "./ui";

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
						<General control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<Channels
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<Results
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<DiceBehaviour control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<StripOOC control={control} channels={channels} textChannels={textChannels} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<HiddenRolls control={control} />
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} />
			</Box>
		</Stack>
	);
}
