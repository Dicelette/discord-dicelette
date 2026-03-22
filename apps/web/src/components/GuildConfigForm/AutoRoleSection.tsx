import { Typography } from "@mui/material";
import { type Control, Controller } from "react-hook-form";
import { useI18n } from "../../i18n";
import type { ApiGuildConfig } from "../../lib/api";
import RoleSelect from "./RoleSelect";
import SectionTitle from "./SectionTitle";
import type { Role } from "./types";

interface Props {
	control: Control<ApiGuildConfig>;
	roles: Role[];
}

export default function AutoRoleSection({ control, roles }: Props) {
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
