import { FormControlLabel, Switch, TextField } from "@mui/material";
import { type HiddenRoleProps, SectionTitle, useI18n } from "@shared";
import { Controller, useWatch } from "react-hook-form";

export default function HiddenRolls({ control }: HiddenRoleProps) {
	const hiddenRoll = useWatch({ control, name: "hiddenRoll" });
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.hiddenRolls")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="hiddenRoll"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!field.value}
									onChange={(e) => field.onChange(e.target.checked || false)}
								/>
							}
							label={t("config.fields.hiddenRollEnable")}
						/>
					)}
				/>
				{hiddenRoll && (
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
									<TextField
										label={t("config.fields.channelId")}
										size="small"
										value={typeof field.value === "string" ? field.value : ""}
										onChange={(e) => field.onChange(e.target.value)}
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
