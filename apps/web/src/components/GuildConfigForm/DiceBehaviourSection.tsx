import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import SectionTitle from "./SectionTitle";

const BOOL_FIELDS = [
	["disableThread", "config.fields.disableThread"],
	["timestamp", "config.fields.timestamp"],
	["context", "config.fields.context"],
	["linkToLogs", "config.fields.linkToLogs"],
	["disableCompare", "config.fields.disableCompare"],
] as const;

interface Props {
	control: Control<ApiGuildConfig>;
}

export default function DiceBehaviourSection({ control }: Props) {
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
										onChange={(e) => field.onChange(e.target.checked || undefined)}
									/>
								}
								label={t(labelKey)}
							/>
						)}
					/>
				))}
			</div>

			<Box sx={{ mt: 3 }}>
				<Controller
					name="deleteAfter"
					control={control}
					render={({ field }) => (
						<>
							<Typography variant="body2" gutterBottom>
								{t("config.fields.deleteAfter", { val: field.value ?? 0 })}
							</Typography>
							<Slider
								value={field.value ?? 0}
								min={0}
								max={3600}
								step={30}
								onChange={(_, v) => field.onChange((v as number) || undefined)}
								valueLabelDisplay="auto"
								sx={{ maxWidth: 400 }}
							/>
						</>
					)}
				/>
			</Box>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
				<Controller
					name="pity"
					control={control}
					render={({ field }) => (
						<TextField
							label={t("config.fields.pity")}
							type="number"
							size="small"
							value={field.value ?? ""}
							onChange={(e) =>
								field.onChange(e.target.value ? Number(e.target.value) : undefined)
							}
							slotProps={{ htmlInput: { min: 0 } }}
						/>
					)}
				/>
			</div>
		</>
	);
}
