import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import ChannelSelect from "./ChannelSelect";
import SectionTitle from "./SectionTitle";
import type { Channel } from "./types";

interface Props {
	control: Control<ApiGuildConfig>;
	stripOOC: ApiGuildConfig["stripOOC"];
	channels: Channel[];
	textChannels: Channel[];
}

export default function StripOOCSection({
	control,
	stripOOC,
	channels,
	textChannels,
}: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.sections.stripOoc")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="stripOOC"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={field.value !== undefined}
									onChange={(e) => field.onChange(e.target.checked ? {} : undefined)}
								/>
							}
							label={t("config.fields.stripOocEnable")}
						/>
					)}
				/>
			</div>
			{stripOOC !== undefined && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<Controller
						name="stripOOC.regex"
						control={control}
						render={({ field }) => (
							<TextField
								label={t("config.fields.stripOocRegex")}
								size="small"
								fullWidth
								value={field.value ?? ""}
								onChange={(e) => field.onChange(e.target.value || undefined)}
							/>
						)}
					/>
					<Box>
						<Controller
							name="stripOOC.timer"
							control={control}
							render={({ field }) => (
								<>
									<Typography variant="body2" gutterBottom>
										{t("config.fields.stripOocDelay", {
											val: field.value ? field.value / 1000 : 0,
										})}
									</Typography>
									<Slider
										value={field.value ? field.value / 1000 : 0}
										min={0}
										max={3600}
										step={30}
										onChange={(_, v) =>
											field.onChange((v as number) ? (v as number) * 1000 : undefined)
										}
										valueLabelDisplay="auto"
										sx={{ maxWidth: 400 }}
									/>
								</>
							)}
						/>
					</Box>
					<Controller
						name="stripOOC.categoryId"
						control={control}
						render={({ field }) => {
							const selected = channels.filter((c) =>
								(field.value ?? []).includes(c.id)
							);
							return (
								<Autocomplete
									fullWidth
									size="small"
									multiple
									options={channels}
									getOptionLabel={(c) =>
										`${c.type === 4 ? "\u{1F4C2}" : "#"} ${c.name}`
									}
									value={selected}
									onChange={(_, newValue) =>
										field.onChange(
											newValue.length ? newValue.map((c) => c.id) : undefined
										)
									}
									renderInput={(params) => (
										<TextField
											{...params}
											label={t("config.fields.stripOocChannels")}
											slotProps={{
												input: { ...params.InputProps },
												htmlInput: { ...params.inputProps, readOnly: true },
											}}
										/>
									)}
								/>
							);
						}}
					/>
					<Controller
						name="stripOOC.forwardId"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.stripOocForward")}
								value={field.value}
								channels={textChannels}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
					<Controller
						name="stripOOC.threadMode"
						control={control}
						render={({ field }) => (
							<FormControlLabel
								control={
									<Switch
										checked={!!field.value}
										onChange={(e) => field.onChange(e.target.checked || undefined)}
									/>
								}
								label={t("config.fields.stripOocThreadMode")}
							/>
						)}
					/>
				</div>
			)}
		</>
	);
}
