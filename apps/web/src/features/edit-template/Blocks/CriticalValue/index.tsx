import { Box, Tooltip } from "@mui/material";
import { useId } from "react";
import { Section, Textfield } from "../../Atoms";
import type { CriticalValues } from "../../interfaces";
import { criticalErrorMessage, errorClass } from "./errors";

type CriticalValueProps = {
	critical: CriticalValues;
};

export default ({ critical }: CriticalValueProps) => {
	const baseId = useId();
	const tooltipBase = `critical-${baseId}`;

	const successMsg = criticalErrorMessage(critical, "success");
	const failureMsg = criticalErrorMessage(critical, "failure");

	return (
		<Section label="Critique">
			<Tooltip title={successMsg || ""} arrow placement="right">
				<Box component="span" sx={{ display: "inline-block" }}>
					<Textfield
						label="Succès"
						name="critical.success"
						type="number"
						id={`${tooltipBase}-success`}
						className={`success ${errorClass(critical, "success")}`}
						slotProps={{ htmlInput: { min: 0 } }}
						error={!!successMsg}
					/>
				</Box>
			</Tooltip>
			<Tooltip title={failureMsg || ""} arrow placement="right">
				<Box component="span" sx={{ display: "inline-block" }}>
					<Textfield
						label="Échec"
						name="critical.failure"
						type="number"
						id={`${tooltipBase}-failure`}
						className={`failure ${errorClass(critical, "failure")}`}
						slotProps={{ htmlInput: { min: 0 } }}
						error={!!failureMsg}
					/>
				</Box>
			</Tooltip>
		</Section>
	);
};
