import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import SectionTitle from "./SectionTitle";

interface Props {
	control: Control<ApiGuildConfig>;
	allowSelfRegister: ApiGuildConfig["allowSelfRegister"];
}

export default function SelfRegisterSection({ control, allowSelfRegister }: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.selfRegister")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="allowSelfRegister"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!field.value}
									onChange={(e) => field.onChange(e.target.checked || undefined)}
								/>
							}
							label={t("config.fields.allowSelfRegister")}
						/>
					)}
				/>
				{allowSelfRegister && typeof allowSelfRegister !== "boolean" && (
					<Controller
						name="allowSelfRegister"
						control={control}
						render={({ field }) => (
							<TextField
								label={t("config.fields.moderationChannel")}
								size="small"
								value={typeof field.value === "string" ? field.value : ""}
								onChange={(e) => field.onChange(e.target.value || true)}
								helperText={t("config.fields.moderationChannelHelp")}
							/>
						)}
					/>
				)}
			</div>
		</>
	);
}
