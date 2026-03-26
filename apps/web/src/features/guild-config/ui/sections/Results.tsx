import type { ApiGuildData } from "@dicelette/types";
import { Box, FormControlLabel, Switch } from "@mui/material";
import { type Control, Controller, useWatch } from "react-hook-form";
import { NumberField, useI18n } from "../../../../shared";
import type { Channel } from "../../types";
import { millisecondsToSeconds, secondsToMilliseconds } from "../../utils";
import { ChannelSelect, SectionTitle } from "../atoms";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}

export default function Results({ control, textChannels, allChannels }: Props) {
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
					render={({ field }) => {
						const secondsValue = millisecondsToSeconds(field.value);

						return (
							<NumberField
								label={t("config.fields.deleteAfter")}
								value={secondsValue}
								min={0}
								max={3600}
								step={1}
								disabled={!savingActive}
								onChange={(seconds) => field.onChange(secondsToMilliseconds(seconds))}
								sx={{ maxWidth: 400 }}
							/>
						);
					}}
				/>
			</Box>
		</>
	);
}
