import type { ApiGuildData, TemplateResult } from "@dicelette/types";
import { Box, Paper, Stack } from "@mui/material";
import {
	type Channel,
	ConfigFormFooter,
	type Role,
	useConfigForm,
	useI18n,
} from "@shared";
import { useCallback } from "react";
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

interface Props {
	config: ApiGuildData;
	guildId: string;
	onSave: (updates: Partial<ApiGuildData>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
	roles: Role[];
	isStrictAdmin: boolean;
}

export default function GuildConfigForm({
	config,
	onSave,
	saving,
	channels,
	roles,
	isStrictAdmin,
}: Props) {
	const { t } = useI18n();
	const { control, handleSubmit, isDirty, reset, textChannels } = useConfigForm(
		config,
		channels
	);

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
					<Paper sx={{ p: 3 }}>
						<DashboardAccess
							control={control}
							roles={roles}
							isStrictAdmin={isStrictAdmin}
						/>
					</Paper>
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
						<HiddenRolls
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 0 }}>
						<Links isTemplate={true} state={templateState} />
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} onReset={() => reset()} />
			</Box>
		</Stack>
	);
}
