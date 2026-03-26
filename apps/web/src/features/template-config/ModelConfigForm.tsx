import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { ConfigFormFooter, type ConfigFormProps, useConfigForm, useI18n } from "@shared";
import { AutoRole } from "./atoms";
import { SelfRegister } from "./sections";
import TemplateManager from "./TemplateManager.tsx";

export default function ModelConfigForm({
	config,
	guildId,
	onSave,
	saving,
	channels,
	roles,
}: ConfigFormProps) {
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
					<Paper sx={{ p: 3 }}>
						<TemplateManager
							guildId={guildId}
							channels={channels}
							defaultTemplateChannelId={config.templateID?.channelId}
							defaultPublicChannelId={config.managerId}
							defaultPrivateChannelId={config.privateChannel}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<AutoRole control={control} roles={roles} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<SelfRegister
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} />
			</Box>
		</Stack>
	);
}
