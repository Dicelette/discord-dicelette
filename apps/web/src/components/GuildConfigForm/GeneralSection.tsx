import { Autocomplete, TextField } from "@mui/material";
import { useMemo } from "react";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import SectionTitle from "./atoms/SectionTitle";

const DISCORD_LOCALES = [
	{ value: "en-US", label: "English" },
	{ value: "fr", label: "Français" },
];

interface Props {
	control: Control<ApiGuildConfig>;
}

export default function GeneralSection({ control }: Props) {
	const { t } = useI18n();

	const sortOrders = useMemo(
		() => [
			{ value: "ascending", label: t("config.sort.options.ascending") },
			{ value: "descending", label: t("config.sort.options.descending") },
		],
		[t]
	);

	return (
		<>
			<SectionTitle>{t("config.sections.general")}</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="lang"
					control={control}
					render={({ field }) => {
						const selected =
							DISCORD_LOCALES.find((l) => l.value === (field.value ?? "en-US")) ??
							DISCORD_LOCALES[0];
						return (
							<Autocomplete
								fullWidth
								size="small"
								disableClearable
								options={DISCORD_LOCALES}
								getOptionLabel={(l) => l.label}
								value={selected}
								onChange={(_, newValue) => field.onChange(newValue.value)}
								renderInput={(params) => (
									<TextField
										{...params}
										label={t("config.fields.lang")}
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
					name="sortOrder"
					control={control}
					render={({ field }) => {
						const selected = sortOrders.find((s) => s.value === field.value) ?? null;
						return (
							<Autocomplete
								fullWidth
								size="small"
								options={sortOrders}
								getOptionLabel={(s) => s.label}
								value={selected}
								onChange={(_, newValue) => field.onChange(newValue?.value ?? undefined)}
								renderInput={(params) => (
									<TextField
										{...params}
										label={t("config.fields.sortOrder")}
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
			</div>
		</>
	);
}
