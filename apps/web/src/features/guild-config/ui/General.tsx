import { SortOrder } from "@dicelette/core";
import type { ApiGuildData } from "@dicelette/types";
import { Autocomplete, TextField } from "@mui/material";
import { SectionTitle, useI18n } from "@shared";
import { memo, useMemo } from "react";
import { type Control, Controller } from "react-hook-form";

const DISCORD_LOCALES = [
	{ value: "en-US", label: "English" },
	{ value: "fr", label: "Français" },
];

const SORT_ORDERS: { value: NonNullable<ApiGuildData["sortOrder"]>; labelKey: string }[] =
	[
		{ value: SortOrder.Ascending, labelKey: "config.sort.options.ascending" },
		{ value: SortOrder.Descending, labelKey: "config.sort.options.descending" },
	];

interface Props {
	control: Control<ApiGuildData>;
}

function General({ control }: Props) {
	const { t } = useI18n();

	const sortOrders = useMemo(
		() => SORT_ORDERS.map((order) => ({ value: order.value, label: t(order.labelKey) })),
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
								onChange={(_, newValue) =>
									field.onChange(newValue?.value ?? SortOrder.None)
								}
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

export default memo(General);
