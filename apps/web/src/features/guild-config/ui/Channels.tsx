import type { ApiGuildData } from "@dicelette/types";
import { type Channel, ChannelSelect, SectionTitle, useI18n } from "@shared";
import { type Control, Controller } from "react-hook-form";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
	allChannels?: Channel[];
}

export default function Channels({ control, textChannels, allChannels }: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.stripOOC.categories")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="logs"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.logs")}
							value={field.value}
							channels={textChannels}
							allChannels={allChannels}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
			</div>
		</>
	);
}
