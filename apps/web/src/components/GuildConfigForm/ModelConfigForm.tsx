import { Alert, Box, Paper, Stack } from "@mui/material";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api.ts";
import AutoRoleSection from "./AutoRoleSection";
import ConfigFormFooter from "./ConfigFormFooter";
import HiddenRollsSection from "./HiddenRollsSection";
import SelfRegisterSection from "./SelfRegisterSection";
import SheetsChannelsSection from "./SheetsChannelsSection";
import TemplateManagerSection from "./TemplateManagerSection";
import type { Channel, Role } from "./types";
import { useConfigForm } from "./useConfigForm";

interface Props {
	config: ApiGuildConfig;
	guildId: string;
	onSave: (updates: Partial<ApiGuildConfig>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
	roles: Role[];
}

export default function ModelConfigForm({
	config,
	guildId,
	onSave,
	saving,
	channels,
	roles,
}: Props) {
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
						<TemplateManagerSection guildId={guildId} />
					</Paper>
					<Paper sx={{ p: 3 }}>
						<SheetsChannelsSection control={control} textChannels={textChannels} />
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
