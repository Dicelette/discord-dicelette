import type { ApiGuildData } from "@dicelette/types";
import { Alert, Autocomplete, TextField } from "@mui/material";
import { type Role, SectionTitle, useI18n } from "@shared";
import { memo } from "react";
import { type Control, Controller, useWatch } from "react-hook-form";

const alertMbSx = { mb: 2 } as const;

interface Props {
	control: Control<ApiGuildData>;
	roles: Role[];
	isStrictAdmin: boolean;
}

function DashboardAccess({ control, roles, isStrictAdmin }: Props) {
	const { t } = useI18n();
	const dashboardAccess = useWatch({ control, name: "dashboardAccess" });
	const hasRoles = dashboardAccess && dashboardAccess.length > 0;

	return (
		<>
			<SectionTitle>{t("config.sections.dashboardAccess")}</SectionTitle>
			{hasRoles && (
				<Alert severity="warning" sx={alertMbSx}>
					{t("config.fields.dashboardAccessWarning")}
				</Alert>
			)}
			<Controller
				name="dashboardAccess"
				control={control}
				render={({ field }) => {
					const selected = roles.filter((r) => (field.value ?? []).includes(r.id));
					return (
						<Autocomplete
							fullWidth
							size="small"
							multiple
							disabled={!isStrictAdmin}
							options={roles}
							getOptionKey={(r) => r.id}
							getOptionLabel={(r) => `@ ${r.name}`}
							value={selected}
							onChange={(_, newValue) => field.onChange(newValue.map((r) => r.id))}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("config.fields.dashboardAccess")}
									helperText={
										isStrictAdmin
											? t("config.fields.dashboardAccessHelper")
											: t("config.fields.dashboardAccessAdminOnly")
									}
									slotProps={{
										...params.slotProps,
										input: { ...params.slotProps.input },
										htmlInput: { ...params.slotProps.htmlInput },
									}}
								/>
							)}
						/>
					);
				}}
			/>
		</>
	);
}

export default memo(DashboardAccess);
