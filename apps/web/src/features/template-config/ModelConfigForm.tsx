import type { ApiGuildData } from "@dicelette/types";
import { Box, Paper, Stack } from "@mui/material";
import { ConfigFormFooter, type ConfigFormProps, useConfigForm } from "@shared";
import { AutoRole } from "./atoms";
import { SelfRegister } from "./sections";
import TemplateManager from "./TemplateManager.tsx";

const paperSx = { p: 3 } as const;

export default function ModelConfigForm({
	config,
	guildId,
	onSave,
	saving,
	channels,
	roles,
}: ConfigFormProps) {
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
			<Box component="form" onSubmit={handleSubmit(handleSaveAndReset)}>
				<Stack spacing={2}>
					<Paper sx={paperSx}>
						<TemplateManager
							guildId={guildId}
							channels={channels}
							defaultTemplateChannelId={config.templateID?.channelId}
							defaultPublicChannelId={config.managerId}
							defaultPrivateChannelId={config.privateChannel}
						/>
					</Paper>

					<Paper sx={paperSx}>
						<AutoRole control={control} roles={roles} />
					</Paper>

					<Paper sx={paperSx}>
						<SelfRegister
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} onReset={() => reset()} />
			</Box>
		</Stack>
	);
}
