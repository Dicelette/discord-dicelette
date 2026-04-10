import type { ApiGuildData, TemplateResult } from "@dicelette/types";
import { Box, Paper, Stack } from "@mui/material";
import {
	type Channel,
	ConfigFormFooter,
	type Role,
	useConfigForm,
	useI18n,
} from "@shared";
import { useCallback, useEffect } from "react";
import { useTemplateState } from "../user-config/hooks";
import Links from "../user-config/ui/sections/Links";
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

interface Props {
	config: ApiGuildData;
	guildId: string;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	saving: boolean;
	saveSuccess?: boolean;
	onDirtyChange?: (isDirty: boolean) => void;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
}

export default function GuildConfigForm({
	config,
	onSave,
	saving,
	saveSuccess,
	onDirtyChange,
	channels,
	roles,
	isStrictAdmin,
}: Props) {
	const { t } = useI18n();
	const { control, handleSubmit, isDirty, reset, textChannels } = useConfigForm(
		config,
		channels
	);

	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	const saveFn = useCallback(
		(template: TemplateResult) => onSave({ createLinkTemplate: template }),
		[onSave]
	);

	const templateState = useTemplateState(config.createLinkTemplate, saveFn, {
		externalValue: config.createLinkTemplate,
		errorKey: "dashboard.saveError",
	});

	const handleSaveAndReset = async (data: ApiGuildData) => {
		await onSave({
			...data,
			createLinkTemplate: templateState.value,
		});
		reset(data);
	};

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
					isDirty={isDirty}
					saving={saving}
					onReset={() => reset()}
					saveSuccess={saveSuccess}
				/>
			</Box>
		</Stack>
	);
}
