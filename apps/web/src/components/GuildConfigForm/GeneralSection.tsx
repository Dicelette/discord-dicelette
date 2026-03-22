import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useMemo } from "react";
import { Controller, type Control } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import SectionTitle from "./SectionTitle";

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
			{ value: "", label: t("config.fields.sortNone") },
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
					render={({ field }) => (
						<FormControl fullWidth size="small">
							<InputLabel>{t("config.fields.lang")}</InputLabel>
							<Select
								{...field}
								value={field.value ?? "en-US"}
								label={t("config.fields.lang")}
							>
								{DISCORD_LOCALES.map((l) => (
									<MenuItem key={l.value} value={l.value}>
										{l.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
				/>
				<Controller
					name="sortOrder"
					control={control}
					render={({ field }) => (
						<FormControl fullWidth size="small">
							<InputLabel>{t("config.fields.sortOrder")}</InputLabel>
							<Select
								{...field}
								value={field.value ?? ""}
								label={t("config.fields.sortOrder")}
								onChange={(e) => field.onChange(e.target.value || undefined)}
							>
								{sortOrders.map((s) => (
									<MenuItem key={s.value} value={s.value}>
										{s.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
				/>
			</div>
		</>
	);
}
