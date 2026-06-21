import { userApi } from "@dicelette/api";
import { validateCustomFormula } from "@dicelette/core";
import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";
import { TransWithLink, useI18n } from "@shared";
import { memo, useState } from "react";
import { FormAccordion } from "../atoms";
import { useSaveSuccessToast } from "./hooks";
import { actionsBoxSx, alertMbSx } from "./styles.ts";

interface Props {
	guildId: string;
	initialFormula?: string;
}

function General({ guildId, initialFormula }: Props) {
	const { t } = useI18n();
	const [formula, setFormula] = useState(initialFormula ?? "");
	const [formulaError, setFormulaError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useSaveSuccessToast(success);

	const handleChange = (value: string) => {
		setFormula(value);
		setSaveError(null);
		if (!value.trim()) {
			setFormulaError(null);
			return;
		}
		const result = validateCustomFormula(value);
		setFormulaError(
			result.ok ? null : t("config.fields.customFormulaInvalid", { error: result.error })
		);
	};

	const handleSave = async () => {
		const trimmed = formula.trim();
		if (trimmed) {
			const result = validateCustomFormula(trimmed);
			if (!result.ok) {
				setFormulaError(t("config.fields.customFormulaInvalid", { error: result.error }));
				return;
			}
		}
		setSaving(true);
		setSuccess(false);
		setSaveError(null);
		try {
			await userApi.updateUserConfig(guildId, {
				customFormula: trimmed,
			});
			setSuccess(true);
			setTimeout(() => setSuccess(false), 3000);
		} catch {
			setSaveError(t("userConfig.saveError"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<FormAccordion title={t("userConfig.sections.general")} defaultExpanded>
			<Box sx={{ pt: 1 }}>
				<TextField
					fullWidth
					size="small"
					label={t("config.fields.customFormula")}
					value={formula}
					onChange={(e) => handleChange(e.target.value)}
					error={!!formulaError}
					helperText={
						formulaError ?? (
							<TransWithLink
								i18nKey="userConfig.customFormulaHelper"
								href="https://mathjs.org"
								linkText="Mathjs"
							/>
						)
					}
					slotProps={{
						input: { sx: { fontFamily: "var(--code-font-family)" } },
					}}
				/>
			</Box>
			<Box sx={actionsBoxSx}>
				<Button
					variant="contained"
					onClick={handleSave}
					disabled={saving || !!formulaError}
					startIcon={saving ? <CircularProgress size={16} /> : undefined}
				>
					{saving ? t("common.saving") : t("common.save")}
				</Button>
			</Box>
			{saveError && (
				<Alert severity="error" sx={alertMbSx} onClose={() => setSaveError(null)}>
					{saveError}
				</Alert>
			)}
		</FormAccordion>
	);
}

export default memo(General);
