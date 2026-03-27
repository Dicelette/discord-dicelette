import { FormControlLabel, Switch, Typography } from "@mui/material";
import { ChannelSelect, type HiddenRoleProps, SectionTitle, useI18n } from "@shared";
import { Controller, useWatch } from "react-hook-form";

export default function HiddenRolls({
	control,
	textChannels,
	allChannels,
}: HiddenRoleProps) {
	const hiddenRoll = useWatch({ control, name: "hiddenRoll" });
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.hiddenRolls")}</SectionTitle>
			<Typography variant={"subtitle1"}>
				{t("config.sections.hiddenRollsDesc")}
			</Typography>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="hiddenRoll"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={field.value === true || typeof field.value === "string"}
									onChange={(e) => field.onChange(e.target.checked)}
								/>
							}
							label={t("common.enable")}
						/>
					)}
				/>
				{(hiddenRoll === true || typeof hiddenRoll === "string") && (
					<>
						<Controller
							name="hiddenRoll"
							control={control}
							render={({ field }) => (
								<FormControlLabel
									control={
										<Switch
											checked={field.value === true}
											onChange={(e) => field.onChange(e.target.checked ? true : "")}
										/>
									}
									label={t("config.fields.hiddenRollDm")}
								/>
							)}
						/>
						{hiddenRoll !== true && (
							<Controller
								name="hiddenRoll"
								control={control}
								render={({ field }) => (
									<ChannelSelect
										label={t("config.fields.channelId")}
										value={typeof field.value === "string" ? field.value : ""}
										channels={textChannels}
										allChannels={allChannels}
										onChange={(v) => field.onChange(v)}
									/>
								)}
							/>
						)}
					</>
				)}
			</div>
		</>
	);
}
