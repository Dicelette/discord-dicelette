import type { ApiGuildData } from "@dicelette/types";
import { Box, FormControlLabel, Slider, Switch, Typography } from "@mui/material";
import { type Control, Controller, useWatch } from "react-hook-form";
import { useI18n } from "../../../../shared/i18n";
import { ChannelSelect, SectionTitle } from "../atoms";
import type { Channel } from "../../types";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}

export default function ResultsSection({ control, textChannels, allChannels }: Props) {
	const { t } = useI18n();
	const disableThread = useWatch({ control, name: "disableThread" });

	const savingActive = !disableThread;

	return (
		<>
			<SectionTitle>{t("config.sections.results")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="disableThread"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!field.value}
									onChange={(e) => field.onChange(e.target.checked || false)}
								/>
							}
							label={t("config.fields.disableThread")}
						/>
					)}
				/>

				<Controller
					name="rollChannel"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.rollChannel")}
							value={field.value}
							channels={textChannels}
							allChannels={allChannels}
							disabled={!!disableThread}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>

				<Controller
					name="context"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!field.value}
									disabled={!savingActive}
									onChange={(e) => field.onChange(e.target.checked || false)}
								/>
							}
							label={t("config.fields.context")}
						/>
					)}
				/>

				<Controller
					name="linkToLogs"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!field.value}
									disabled={!savingActive}
									onChange={(e) => field.onChange(e.target.checked || false)}
								/>
							}
							label={t("config.fields.linkToLogs")}
						/>
					)}
				/>
			</div>

			<Box sx={{ mt: 3 }}>
				<Controller
					name="deleteAfter"
					control={control}
					render={({ field }) => (
						<>
							<Typography
								variant="body2"
								gutterBottom
								sx={{ color: savingActive ? "inherit" : "text.disabled" }}
							>
								{t("config.fields.deleteAfter", { val: field.value ?? 0 })}
							</Typography>
							<Slider
								value={field.value ?? 0}
								min={0}
								max={3600}
								step={30}
								disabled={!savingActive}
								onChange={(_, v) => field.onChange((v as number) || undefined)}
								valueLabelDisplay="auto"
								sx={{ maxWidth: 400 }}
							/>
						</>
					)}
				/>
			</Box>
		</>
	);
}
