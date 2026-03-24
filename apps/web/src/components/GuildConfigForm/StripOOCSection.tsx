import type { ApiGuildData } from "@dicelette/types";
import {
	Autocomplete,
	Box,
	FormControlLabel,
	Slider,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { type Control, Controller, useController, useWatch } from "react-hook-form";
import { useI18n } from "../../i18n";
import { ChannelSelect, SectionTitle } from "./atoms";
import type { Channel } from "./types";

function escapeRegex(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(prefix: string, suffix: string): string | undefined {
	if (!prefix && !suffix) return undefined;
	return `^${escapeRegex(prefix)}(.*)${escapeRegex(suffix)}$`;
}

interface Props {
	control: Control<ApiGuildData>;
	channels: Channel[];
	textChannels: Channel[];
}

export default function StripOOCSection({ control, channels, textChannels }: Props) {
	const { t } = useI18n();
	const stripOOC = useWatch({ control, name: "stripOOC" });
	const { field: regexField } = useController({ name: "stripOOC.regex", control });

	const [advancedMode, setAdvancedMode] = useState(() => !!stripOOC?.regex);
	const [prefix, setPrefix] = useState("");
	const [suffix, setSuffix] = useState("");
	const [regexDisplayValue, setRegexDisplayValue] = useState(() => stripOOC?.regex ?? "");
	const [regexError, setRegexError] = useState<string | null>(null);

	const handleToggleAdvanced = (checked: boolean) => {
		setAdvancedMode(checked);
		setRegexError(null);
		if (!checked) regexField.onChange(buildRegex(prefix, suffix));
		else setRegexDisplayValue(regexField.value ?? "");
	};

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
					<FormControlLabel
						sx={{ gridColumn: "span 2" }}
						control={
							<Switch
								checked={advancedMode}
								onChange={(e) => handleToggleAdvanced(e.target.checked)}
							/>
						}
						label={t("config.fields.stripOocAdvanced")}
					/>
					{!advancedMode ? (
						<>
							<TextField
								label={t("config.fields.stripOocPrefix")}
								size="small"
								fullWidth
								value={prefix}
								onChange={(e) => setPrefix(e.target.value)}
								onBlur={() => regexField.onChange(buildRegex(prefix, suffix))}
							/>
							<TextField
								label={t("config.fields.stripOocSuffix")}
								size="small"
								fullWidth
								value={suffix}
								onChange={(e) => setSuffix(e.target.value)}
								onBlur={() => regexField.onChange(buildRegex(prefix, suffix))}
							/>
							{(prefix || suffix) && (
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ gridColumn: "span 2" }}
								>
									{t("config.fields.stripOocRegexPreview", {
										regex: buildRegex(prefix, suffix) ?? "",
									})}
								</Typography>
							)}
						</>
					) : (
						<TextField
							label={t("config.fields.stripOocRegex")}
							size="small"
							fullWidth
							value={regexDisplayValue}
							onChange={(e) => {
								const val = e.target.value;
								setRegexDisplayValue(val);
								setRegexError(null);
								if (!val) {
									regexField.onChange(undefined);
									return;
								}
								let anchored = val;
								if (!anchored.startsWith("^")) anchored = `^${anchored}`;
								if (!anchored.endsWith("$")) anchored = `${anchored}$`;
								try {
									new RegExp(anchored);
									regexField.onChange(anchored);
								} catch {
									setRegexError(t("config.fields.stripOocRegexInvalid"));
									regexField.onChange(undefined);
								}
							}}
							error={!!regexError}
							helperText={regexError ?? t("config.fields.stripOocRegexHelp")}
						/>
					)}
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
							const selected = channels.filter((c) => (field.value ?? []).includes(c.id));
							return (
								<Autocomplete
									fullWidth
									size="small"
									multiple
									options={channels}
									getOptionKey={(c) => c.id}
									getOptionLabel={(c) => `${c.type === 4 ? "\u{1F4C2}" : "#"} ${c.name}`}
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
