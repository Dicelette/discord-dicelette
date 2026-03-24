import type { ApiGuildData } from "@dicelette/types";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import { ChannelSelect, SectionTitle } from "./atoms";
import type { Channel } from "./types";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	disabled?: boolean;
}

export default function SheetsChannelsSection({
	control,
	textChannels,
	disabled,
}: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.sheetsChannels")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="managerId"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.defaultChannel")}
							value={field.value}
							channels={textChannels}
							onChange={(v) => field.onChange(v || undefined)}
							disabled={disabled}
						/>
					)}
				/>
				<Controller
					name="privateChannel"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.privateChannel")}
							value={field.value}
							channels={textChannels}
							onChange={(v) => field.onChange(v || undefined)}
							disabled={disabled}
						/>
					)}
				/>
			</div>
		</>
	);
}
