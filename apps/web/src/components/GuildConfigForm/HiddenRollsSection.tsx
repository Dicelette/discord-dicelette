import { FormControlLabel, Switch, TextField } from "@mui/material";
import { type Control, Controller, useWatch } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import SectionTitle from "./atoms/SectionTitle";

interface Props {
	control: Control<ApiGuildConfig>;
}

export default function HiddenRollsSection({ control }: Props) {
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
									onChange={(e) => field.onChange(e.target.checked || undefined)}
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
