import type { ApiGuildData } from "@dicelette/types";
import { FormControlLabel, Switch } from "@mui/material";
import { type Channel, ChannelSelect, SectionTitle, useI18n } from "@shared";
import { type Control, useController } from "react-hook-form";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}

export default function SelfRegister({ control, textChannels, allChannels }: Props) {
	const { t } = useI18n();
	const { field } = useController({
		name: "allowSelfRegister",
		control,
	});

	const isEnabled = Boolean(field.value);
	const selectedChannel = typeof field.value === "string" ? field.value : undefined;

	return (
		<>
			<SectionTitle>{t("config.sections.selfRegister")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormControlLabel
					control={
						<Switch
							checked={isEnabled}
							onChange={(_, checked) => {
								field.onChange(checked ? (selectedChannel ?? true) : false);
							}}
						/>
					}
					label={t("config.fields.allowSelfRegister")}
				/>
				{isEnabled && (
					<ChannelSelect
						label={t("config.fields.moderationChannel")}
						value={selectedChannel}
						channels={textChannels}
						allChannels={allChannels}
						onChange={(value) => field.onChange(value || true)}
					/>
				)}
			</div>
		</>
	);
}
