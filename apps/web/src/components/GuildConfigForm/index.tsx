import { Alert, Box, Button, Divider, Paper, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import { guildApi } from "../../lib/api";
import AutoRoleSection from "./AutoRoleSection";
import ChannelsSection from "./ChannelsSection";
import DiceBehaviourSection from "./DiceBehaviourSection";
import GeneralSection from "./GeneralSection";
import HiddenRollsSection from "./HiddenRollsSection";
import SelfRegisterSection from "./SelfRegisterSection";
import StripOOCSection from "./StripOOCSection";
import TemplateManagerSection from "./TemplateManagerSection";
import type { Channel, Role } from "./types";

interface Props {
	config: ApiGuildConfig;
	guildId: string;
	onSave: (updates: Partial<ApiGuildConfig>) => Promise<void>;
	saving: boolean;
}

export default function GuildConfigForm({ config, guildId, onSave, saving }: Props) {
	const { t } = useI18n();

	const { control, handleSubmit, reset, watch, formState } = useForm<ApiGuildConfig>({
		defaultValues: config,
	});

	const isDirty = formState.isDirty;

	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		reset(config);
	}, [config, reset]);

	useEffect(() => {
		guildApi
			.getChannels(guildId)
			.then((r) => setChannels(r.data))
			.catch(() => {});
		guildApi
			.getRoles(guildId)
			.then((r) => setRoles(r.data))
			.catch(() => {});
	}, [guildId]);

	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

	const textChannels = useMemo(() => channels.filter((c) => c.type === 0), [channels]);

	const hiddenRoll = watch("hiddenRoll");
	const allowSelfRegister = watch("allowSelfRegister");
	const stripOOC = watch("stripOOC");

	return (
		<Box component="form" onSubmit={handleSubmit(onSave)}>
			{isDirty && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t("config.unsaved")}
				</Alert>
			)}

			<Paper sx={{ p: 3, mb: 2 }}>
				<GeneralSection control={control} />

				<Divider sx={{ my: 3 }} />

				<ChannelsSection control={control} textChannels={textChannels} />

				<Divider sx={{ my: 3 }} />

				<AutoRoleSection control={control} roles={roles} />

				<Divider sx={{ my: 3 }} />

				<DiceBehaviourSection control={control} />

				<Divider sx={{ my: 3 }} />

				<SelfRegisterSection
					control={control}
					allowSelfRegister={allowSelfRegister}
					textChannels={textChannels}
				/>

				<Divider sx={{ my: 3 }} />

				<HiddenRollsSection control={control} hiddenRoll={hiddenRoll} />

				<Divider sx={{ my: 3 }} />

				<StripOOCSection
					control={control}
					stripOOC={stripOOC}
					channels={channels}
					textChannels={textChannels}
				/>

				<Divider sx={{ my: 3 }} />

				<TemplateManagerSection guildId={guildId} />
			</Paper>

			<Box className="flex justify-end gap-3 items-center">
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
	);
}
