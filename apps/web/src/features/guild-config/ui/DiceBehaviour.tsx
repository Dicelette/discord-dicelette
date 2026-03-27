import type { ApiGuildData } from "@dicelette/types";
import { FormControlLabel, Switch } from "@mui/material";
import { NumberField, SectionTitle, useI18n } from "@shared";
import { memo } from "react";
import { type Control, Controller } from "react-hook-form";

const BOOL_FIELDS = [
	["timestamp", "config.fields.timestamp"],
	["disableCompare", "config.fields.disableCompare"],
] as const;

interface Props {
	control: Control<ApiGuildData>;
}

function DiceBehaviour({ control }: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.diceBehaviour")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{BOOL_FIELDS.map(([name, labelKey]) => (
					<Controller
						key={name}
						name={name}
						control={control}
						render={({ field }) => (
							<FormControlLabel
								control={
									<Switch
										checked={!!field.value}
										onChange={(e) => field.onChange(e.target.checked || false)}
									/>
								}
								label={t(labelKey)}
							/>
						)}
					/>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
				<Controller
					name="pity"
					control={control}
					render={({ field }) => (
						<NumberField
							label={t("config.fields.pity")}
							size="small"
							value={field.value ?? null}
							min={0}
							onValueChange={(e) => field.onChange(e ?? undefined)}
						/>
					)}
				/>
			</div>
		</>
	);
}

export default memo(DiceBehaviour);
