import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import ChannelsSection from "./ChannelsSection";
import DiceBehaviourSection from "./DiceBehaviourSection";
import GeneralSection from "./GeneralSection";
import StripOOCSection from "./StripOOCSection";
import type { Channel } from "./types";

interface Props {
	config: ApiGuildConfig;
	guildId: string;
	onSave: (updates: Partial<ApiGuildConfig>) => Promise<void>;
	saving: boolean;
	channels: Channel[];
}

export default function GuildConfigForm({ config, onSave, saving, channels }: Props) {
	const { t } = useI18n();

	const { control, handleSubmit, reset, formState } = useForm<ApiGuildConfig>({
		defaultValues: config,
	});

	const isDirty = formState.isDirty;

	useEffect(() => {
		reset(config);
	}, [config, reset]);

	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

	const textChannels = useMemo(() => channels.filter((c) => c.type === 0), [channels]);

	return (
		<Stack spacing={2}>
			{isDirty && <Alert severity="warning">{t("config.unsaved")}</Alert>}

			<Box component="form" onSubmit={handleSubmit(onSave)}>
				<Stack spacing={2}>
					<Paper sx={{ p: 3 }} title={t("config.sections.general")}>
						<GeneralSection control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<ChannelsSection control={control} textChannels={textChannels} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<DiceBehaviourSection control={control} />
					</Paper>

					<Paper sx={{ p: 3 }}>
						<StripOOCSection
							control={control}
							channels={channels}
							textChannels={textChannels}
						/>
					</Paper>
				</Stack>

				<Box className="flex justify-end gap-3 items-center" sx={{ mt: 2 }}>
					{isDirty && (
						<Typography variant="body2" color="warning.main">
							{t("config.unsaved")}
						</Typography>
					)}
					<Button
						type="submit"
						variant="contained"
						size="large"
						disabled={saving}
						sx={{ minWidth: 160 }}
					>
						{saving ? t("common.saving") : t("common.save")}
					</Button>
				</Box>
			</Box>
		</Stack>
	);
}
