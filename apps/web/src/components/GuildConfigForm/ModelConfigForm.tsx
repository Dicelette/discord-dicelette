import { Alert, Box, Paper, Stack } from "@mui/material";
import { useI18n } from "../../i18n";
import { AutoRoleSection, ConfigFormFooter } from "./atoms";
import HiddenRollsSection from "./HiddenRollsSection";
import SelfRegisterSection from "./SelfRegisterSection";
import TemplateManagerSection from "./TemplateManagerSection";
import type { ConfigFormProps } from "./types";
import { useConfigForm } from "./useConfigForm.ts";

export default function ModelConfigForm({
	config,
	guildId,
	onSave,
	saving,
	channels,
	roles,
}: ConfigFormProps) {
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
					<Paper sx={{ p: 3 }}>
						<TemplateManagerSection
							guildId={guildId}
							channels={channels}
							defaultPublicChannelId={config.managerId}
							defaultPrivateChannelId={config.privateChannel}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<AutoRoleSection control={control} roles={roles} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<SelfRegisterSection control={control} textChannels={textChannels} />
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
