import type { ApiGuildData } from "@dicelette/types";
import { Alert, Box, Paper, Stack } from "@mui/material";
import { type Channel, ConfigFormFooter, type Role, useConfigForm, useI18n } from "@shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TemplateState } from "../user-config/types";
import Links from "../user-config/ui/sections/Links";
import { DEFAULT_TEMPLATE } from "../user-config/utils";
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
}

export default function GuildConfigForm({ config, onSave, saving, channels, roles }: Props) {
	const { t } = useI18n();
	const { control, handleSubmit, isDirty, reset, textChannels } = useConfigForm(
		config,
		channels
	);

	const [template, setTemplate] = useState(config.createLinkTemplate ?? DEFAULT_TEMPLATE);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const [templateSuccess, setTemplateSuccess] = useState(false);
	const [templateError, setTemplateError] = useState<string | null>(null);

	useEffect(() => {
		setTemplate(config.createLinkTemplate ?? DEFAULT_TEMPLATE);
	}, [config.createLinkTemplate]);

	const saveTemplate = useCallback(async () => {
		setSavingTemplate(true);
		setTemplateError(null);
		try {
			await onSave({ createLinkTemplate: template });
			setTemplateSuccess(true);
			setTimeout(() => setTemplateSuccess(false), 3000);
		} catch {
			setTemplateError(t("dashboard.saveError"));
		} finally {
			setSavingTemplate(false);
		}
	}, [onSave, t, template]);

	const resetTemplate = useCallback(() => setTemplate(DEFAULT_TEMPLATE), []);

	const templateState = useMemo<TemplateState>(
		() => ({
			value: template,
			setValue: setTemplate,
			saving: savingTemplate,
			success: templateSuccess,
			error: templateError,
			setError: setTemplateError,
			onSave: saveTemplate,
			onReset: resetTemplate,
		}),
		[
			template,
			savingTemplate,
			templateSuccess,
			templateError,
			saveTemplate,
			resetTemplate,
		]
	);

	const handleSaveAndReset = async (data: ApiGuildData) => {
		await onSave({
			...data,
			createLinkTemplate: template,
		});
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
						<HiddenRolls
							control={control}
							textChannels={textChannels}
							allChannels={channels}
						/>
					</Paper>

					<Paper sx={{ p: 3 }}>
						<DashboardAccess control={control} roles={roles} />
					</Paper>

					<Paper sx={{ p: 0 }}>
						<Links isTemplate={true} state={templateState} />
					</Paper>
				</Stack>

				<ConfigFormFooter isDirty={isDirty} saving={saving} />
			</Box>
		</Stack>
	);
}
