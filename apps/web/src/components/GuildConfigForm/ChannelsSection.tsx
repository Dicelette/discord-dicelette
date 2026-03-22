import { Controller, type Control } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import ChannelSelect from "./ChannelSelect";
import SectionTitle from "./SectionTitle";
import type { Channel } from "./types";

interface Props {
	control: Control<ApiGuildConfig>;
	textChannels: Channel[];
	noneLabel: string;
}

export default function ChannelsSection({ control, textChannels, noneLabel }: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.channels")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="logs"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.logs")}
							value={field.value}
							channels={textChannels}
							noneLabel={noneLabel}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
				<Controller
					name="rollChannel"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.rollChannel")}
							value={field.value}
							channels={textChannels}
							noneLabel={noneLabel}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
				<Controller
					name="managerId"
					control={control}
					render={({ field }) => (
						<ChannelSelect
							label={t("config.fields.defaultChannel")}
							value={field.value}
							channels={textChannels}
							noneLabel={noneLabel}
							onChange={(v) => field.onChange(v || undefined)}
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
							noneLabel={noneLabel}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
			</div>
		</>
	);
}
