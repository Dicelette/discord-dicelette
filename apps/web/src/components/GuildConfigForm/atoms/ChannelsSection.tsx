import type { ApiGuildData } from "@dicelette/types";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../../i18n";
import type { Channel } from "../types";
import ChannelSelect from "./ChannelSelect";
import SectionTitle from "./SectionTitle";

interface Props {
	control: Control<ApiGuildData>;
	textChannels: Channel[];
}

export default function ChannelsSection({ control, textChannels }: Props) {
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
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
			</div>
		</>
	);
}
