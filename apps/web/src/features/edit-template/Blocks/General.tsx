import { Box, Stack, Tooltip } from "@mui/material";
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
	const totalId = useId();
	const isCharNameId = useId();
	const isPrivateId = useId();
	const forceDistribId = useId();

	return (
		<Section label="Général">
			<Box sx={CHECKBOX_GRID_SX}>
				<label htmlFor={isCharNameId}>Rendre obligatoire le nom du personnage</label>
				<CheckBox
					label={""}
					name="isCharNameRequired"
					id={isCharNameId}
					className="ml-0!"
				/>

				<Tooltip
					title="Utilisée uniquement dans le CSV d'importation de fiche"
					arrow
					placement="right"
				>
					<label htmlFor={isPrivateId} className="cursor-help">
						Fiches privées
					</label>
				</Tooltip>
				<CheckBox label={""} name="isPrivate" id={isPrivateId} className="ml-0!" />
			</Box>

			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={2}
				alignItems={{ sm: "flex-start" }}
				sx={{ my: 1 }}
			>
				<Textfield
					label="Total"
					name="total"
					id={totalId}
					type="number"
					slotProps={{ htmlInput: { min: 0 } }}
					sx={TOTAL_SX}
				/>
				<Tooltip
					title="Renvoie une erreur si la somme des statistiques est inférieure au total défini"
					arrow
					placement="right"
				>
					<span>
						<CheckBox
							label="Forcer la distribution des points"
							labelPlacement="end"
							name="forceDistrib"
							id={forceDistribId}
							className="flex items-center gap-1"
						/>
					</span>
				</Tooltip>
			</Stack>

			<Textfield label="Dé principal" name="diceType" />
		</Section>
	);
};

export default General;
