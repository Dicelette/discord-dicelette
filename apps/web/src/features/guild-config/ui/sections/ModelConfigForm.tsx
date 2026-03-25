import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { useConfigForm } from "../../../../shared/hooks/useConfigForm";
import { useI18n } from "../../../../shared/i18n";
import { AutoRoleSection, ConfigFormFooter } from "../atoms";
import type { ConfigFormProps } from "../../types";
import HiddenRollsSection from "./HiddenRollsSection";
import SelfRegisterSection from "./SelfRegisterSection";
import TemplateManagerSection from "./TemplateManagerSection";

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
						<TemplateManagerSection
							guildId={guildId}
							channels={channels}
							defaultTemplateChannelId={config.templateID?.channelId}
							defaultPublicChannelId={config.managerId}
							defaultPrivateChannelId={config.privateChannel}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<AutoRoleSection control={control} roles={roles} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<SelfRegisterSection
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<HiddenRollsSection control={control} />
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} />
			</Box>
		</Stack>
	);
}
