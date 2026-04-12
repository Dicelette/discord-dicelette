import { Box, Stack, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import type { FC } from "react";
import { useId } from "react";
import { CheckBox, Section, Textfield } from "../Atoms";

const CHECKBOX_GRID_SX = {
	display: "grid",
	gridTemplateColumns: "1fr auto",
	alignItems: "center",
	width: "fit-content",
	columnGap: 1,
} as const;

const TOTAL_SX = { width: { xs: "100%", sm: 150 }, mb: 0 } as const;

const General: FC = () => {
	const { t } = useI18n();
	const totalId = useId();
	const isCharNameId = useId();
	const forceDistribId = useId();

	return (
		<Section label={t("template.general")}>
			<Box sx={CHECKBOX_GRID_SX}>
				<label htmlFor={isCharNameId}>{t("template.charName")}</label>
				<CheckBox
					label={""}
					name="isCharNameRequired"
					id={isCharNameId}
					className="ml-0!"
				/>
			</Box>

			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={2}
				alignItems={{ sm: "flex-start" }}
				sx={{ my: 1 }}
			>
				<Textfield
					label={t("template.total")}
					name="total"
					id={totalId}
					type="number"
					slotProps={{ htmlInput: { min: 0 } }}
					sx={TOTAL_SX}
				/>
				<Tooltip title={t("template.forceDistribHelp")} arrow placement="right">
					<span>
						<CheckBox
							label={t("template.forceDistrib")}
							labelPlacement="end"
							name="forceDistrib"
							id={forceDistribId}
							className="flex items-center gap-1"
						/>
					</span>
				</Tooltip>
			</Stack>

			<Textfield label={t("template.diceType")} name="diceType" />
		</Section>
	);
};

export default General;
