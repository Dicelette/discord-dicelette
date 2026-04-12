import { Box, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import { useId } from "react";
import { Section, Textfield } from "../../Atoms";
import type { CriticalValues } from "../../interfaces";
import { criticalErrorMessage, errorClass } from "./errors";

type CriticalValueProps = {
	critical: CriticalValues;
};

export default ({ critical }: CriticalValueProps) => {
	const { t } = useI18n();
	const baseId = useId();
	const tooltipBase = `critical-${baseId}`;

	const successMsgKey = criticalErrorMessage(critical, "success");
	const failureMsgKey = criticalErrorMessage(critical, "failure");
	const successMsg = successMsgKey ? t(successMsgKey) : "";
	const failureMsg = failureMsgKey ? t(failureMsgKey) : "";

	return (
		<Section label={t("template.critical")}>
			<Tooltip title={successMsg} arrow placement="right">
				<Box component="span" sx={{ display: "inline-block" }}>
					<Textfield
						label={t("template.success")}
						name="critical.success"
						type="number"
						id={`${tooltipBase}-success`}
						className={`success ${errorClass(critical, "success")}`}
						slotProps={{ htmlInput: { min: 0 } }}
						error={!!successMsg}
					/>
				</Box>
			</Tooltip>
			<Tooltip title={failureMsg} arrow placement="right">
				<Box component="span" sx={{ display: "inline-block" }}>
					<Textfield
						label={t("template.failure")}
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
