import type { ApiGuildData } from "@dicelette/types";
import { Typography } from "@mui/material";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../../../shared";
import type { Role } from "../../types";
import { RoleSelect, SectionTitle } from "../atoms";

interface Props {
	control: Control<ApiGuildData>;
	roles: Role[];
}

export default function AutoRole({ control, roles }: Props) {
	const { t } = useI18n();

	return (
		<>
			<SectionTitle>{t("config.autoRole")}</SectionTitle>
			<Typography variant="subtitle1">{t("autoRole.description")}</Typography>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					name="autoRole.stats"
					control={control}
					render={({ field }) => (
						<RoleSelect
							label={t("common.statistic").toTitle()}
							value={field.value}
							roles={roles}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
				<Controller
					name="autoRole.dice"
					control={control}
					render={({ field }) => (
						<RoleSelect
							label={t("common.macro").toTitle()}
							value={field.value}
							roles={roles}
							onChange={(v) => field.onChange(v || undefined)}
						/>
					)}
				/>
			</div>
		</>
	);
}
