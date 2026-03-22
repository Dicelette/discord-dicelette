import { FormControlLabel, Switch } from "@mui/material";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import ChannelSelect from "./ChannelSelect";
import SectionTitle from "./SectionTitle";
import type { Channel } from "./types";

interface Props {
	control: Control<ApiGuildConfig>;
	allowSelfRegister: ApiGuildConfig["allowSelfRegister"];
	textChannels: Channel[];
}

export default function SelfRegisterSection({
	control,
	allowSelfRegister,
	textChannels,
}: Props) {
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
				{allowSelfRegister && (
					<Controller
						name="allowSelfRegister"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.moderationChannel")}
								value={typeof field.value === "string" ? field.value : undefined}
								channels={textChannels}
								onChange={(v) => field.onChange(v || true)}
							/>
						)}
					/>
				)}
			</div>
		</>
	);
}
