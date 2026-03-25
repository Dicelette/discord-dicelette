import type { ApiGuildData } from "@dicelette/types";
import { FormControlLabel, Switch } from "@mui/material";
import { type Control, Controller, useWatch } from "react-hook-form";
import { useI18n } from "../../../../shared";
import type { Channel } from "../../types";
import { ChannelSelect, SectionTitle } from "../atoms";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}

export default function SelfRegister({ control, textChannels, allChannels }: Props) {
	const allowSelfRegister = useWatch({ control, name: "allowSelfRegister" });
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
								allChannels={allChannels}
								onChange={(v) => field.onChange(v || true)}
							/>
						)}
					/>
				)}
			</div>
		</>
	);
}
