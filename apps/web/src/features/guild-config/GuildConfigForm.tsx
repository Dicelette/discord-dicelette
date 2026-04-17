import type { ApiGuildData } from "@dicelette/types";
import { Box, Paper, Stack } from "@mui/material";
import { ConfigFormFooter, useConfigForm, useI18n } from "@shared";
import { useCallback, useMemo } from "react";
import Links from "../user-config/ui/sections/Links";
import { DEFAULT_TEMPLATE } from "../user-config/utils";
import { useGuildConfig } from "./context";
import {
	Channels,
	DashboardAccess,
	DiceBehaviour,
	General,
	HiddenRolls,
	Results,
	StripOOC,
} from "./ui";

const paperSx = { p: 3 } as const;
const linksPaperSx = { p: 0 } as const;

export default function GuildConfigForm() {
	const { t } = useI18n();
	const {
		config,
		channels,
		roles,
		isStrictAdmin,
		saving,
		saveSuccess,
		onSave,
		templateState,
	} = useGuildConfig();

	// Guard against undefined config - useConfigForm needs valid data
	if (!config) {
		return null; // Should not happen due to parent checks, but prevents errors
	}

	const { control, handleSubmit, reset, textChannels, isDirty } = useConfigForm(
		config,
		channels
	);

	const isTemplateDirty = useMemo(() => {
		const saved = config.createLinkTemplate ?? DEFAULT_TEMPLATE;
		return JSON.stringify(templateState.value) !== JSON.stringify(saved);
	}, [templateState.value, config.createLinkTemplate]);

	const handleSaveAndReset = useCallback(
		async (data: ApiGuildData) => {
			await onSave({
				...data,
				createLinkTemplate: templateState.value,
			});
			reset(data);
		},
		[onSave, templateState.value, reset]
	);

	return (
		<Stack spacing={2}>
			<Box component="form" onSubmit={handleSubmit(handleSaveAndReset)}>
				<Stack spacing={2}>
					<Paper sx={paperSx}>
						<DashboardAccess
							control={control}
							roles={roles}
							isStrictAdmin={isStrictAdmin}
						/>
					</Paper>
					<Paper sx={{ p: 3 }} title={t("config.sections.general")}>
						<General control={control} />
					</Paper>

					<Paper sx={paperSx}>
						<Channels
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={paperSx}>
						<Results
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={paperSx}>
						<DiceBehaviour control={control} />
					</Paper>

					<Paper sx={paperSx}>
						<StripOOC control={control} channels={channels} textChannels={textChannels} />
					</Paper>

					<Paper sx={paperSx}>
						<HiddenRolls
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={linksPaperSx}>
						<Links isTemplate={true} state={templateState} />
					</Paper>
				</Stack>

				<ConfigFormFooter
					isDirty={isDirty || isTemplateDirty}
					saving={saving}
					onReset={() => {
						reset();
						templateState.setValue(config.createLinkTemplate ?? DEFAULT_TEMPLATE);
					}}
					saveSuccess={saveSuccess}
				/>
			</Box>
		</Stack>
	);
}
