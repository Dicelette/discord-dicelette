import type { ApiGuildData } from "@dicelette/types";
import {
	Autocomplete,
	Box,
	FormControlLabel,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { type Control, Controller, useController, useWatch } from "react-hook-form";
import { NumberField, useI18n } from "../../../../shared";
import type { Channel } from "../../types";
import { millisecondsToSeconds, secondsToMilliseconds } from "../../utils";
import { ChannelSelect, SectionTitle } from "../atoms";

function escapeRegex(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(prefix: string, suffix: string): string | undefined {
	if (!prefix && !suffix) return undefined;
	return `^${escapeRegex(prefix)}(.*)${escapeRegex(suffix)}$`;
}

function decomposeSimpleRegex(regex: string) {
	const format = /^\^(?<prefix>.*)\(\.\*\)(?<suffix>.*)\$$/;
	const executed = format.exec(regex);
	if (!executed?.groups) return regex;
	return { prefix: executed.groups.prefix, suffix: executed.groups.suffix };
}

interface Props {
	control: Control<ApiGuildData>;
	channels: Channel[];
	textChannels: Channel[];
}

export default function StripOOC({ control, channels, textChannels }: Props) {
	const { t } = useI18n();
	const stripOOC = useWatch({ control, name: "stripOOC" });
	const { field: regexField } = useController({ name: "stripOOC.regex", control });

	const [advancedMode, setAdvancedMode] = useState(() => {
		if (!stripOOC?.regex) return false;
		const decomposed = decomposeSimpleRegex(stripOOC.regex);
		return typeof decomposed === "string";
	});
	const [prefix, setPrefix] = useState(() => {
		if (!stripOOC?.regex) return "";
		const decomposed = decomposeSimpleRegex(stripOOC.regex);
		return typeof decomposed === "object" ? decomposed.prefix : "";
	});
	const [suffix, setSuffix] = useState(() => {
		if (!stripOOC?.regex) return "";
		const decomposed = decomposeSimpleRegex(stripOOC.regex);
		return typeof decomposed === "object" ? decomposed.suffix : "";
	});
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
			<SectionTitle>{t("config.stripOOC.title")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="stripOOC"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={
								<Switch
									checked={!!(field.value?.timer && field.value.timer > 0)}
									onChange={(e) =>
										field.onChange(
											e.target.checked ? { timer: 180 * 1000 } : { timer: 0 }
										)
									}
								/>
							}
							label={t("config.fields.stripOocEnable")}
						/>
					)}
				/>
			</div>
			{!!(stripOOC?.timer && stripOOC.timer > 0) && (
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
					<Box sx={{ maxWidth: 400 }}>
						<Controller
							name="stripOOC.timer"
							control={control}
							render={({ field }) => {
								const secondsValue = millisecondsToSeconds(field.value);

								return (
									<NumberField
										label={t("config.fields.stripOocDelay")}
										value={secondsValue}
										size="small"
										min={0}
										max={3600}
										step={30}
										onValueChange={(seconds) =>
											field.onChange(secondsToMilliseconds(seconds))
										}
									/>
								);
							}}
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
								allChannels={channels}
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
