import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useI18n } from "../../i18n";
import type { ApiTemplateResult } from "../../lib/api";
import type { TemplateState } from "./types";

interface Props {
	state: TemplateState;
}

export default function TemplateSection({ state }: Props) {
	const { t } = useI18n();
	const { value: template, setValue: setTemplate, saving, success, error, setError, onSave, onReset } = state;

	return (
		<Accordion>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Typography fontWeight={600}>{t("userConfig.sections.template")}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					{t("userConfig.templateDesc")}
				</Typography>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<TextField
						size="small"
						label={t("userConfig.templateFinal")}
						value={template.final}
						onChange={(e) => setTemplate((p) => ({ ...p, final: e.target.value }))}
						fullWidth
						helperText="{{stats}} {{results}} {{link}}"
					/>
					<TextField
						size="small"
						label={t("userConfig.templateResults")}
						value={template.results}
						sx={{ fontFamily: "var(--code-font-family)" }}
						onChange={(e) => setTemplate((p) => ({ ...p, results: e.target.value }))}
						fullWidth
						helperText="{{info}} {{result}}"
					/>
					<TextField
						size="small"
						label={t("userConfig.templateJoin")}
						value={template.joinResult}
						onChange={(e) => setTemplate((p) => ({ ...p, joinResult: e.target.value }))}
						sx={{ maxWidth: 200, fontFamily: "var(--code-font-family)" }}
					/>
					<Divider />
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ fontFamily: "var(--code-font-family)" }}
					>
						{t("userConfig.templateFormatSection")}
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
						{(
							[
								["name", "{{stat}}"],
								["info", "{{info}}"],
								["dice", "{{dice}}"],
								["originalDice", "{{original_dice}}"],
								["character", "{{character}}"],
							] as [keyof ApiTemplateResult["format"], string][]
						).map(([field, hint]) => (
							<TextField
								key={field}
								size="small"
								label={t(`userConfig.templateFormat.${field}`)}
								value={template.format[field]}
								onChange={(e) =>
									setTemplate((p) => ({
										...p,
										format: { ...p.format, [field]: e.target.value },
									}))
								}
								sx={{ flex: "1 1 200px", fontFamily: "var(--code-font-family)" }}
								helperText={hint}
							/>
						))}
					</Box>
				</Box>
				<Box sx={{ display: "flex", gap: 1, mt: 2 }}>
					<Button
						variant="contained"
						onClick={onSave}
						disabled={saving}
						startIcon={saving ? <CircularProgress size={16} /> : undefined}
					>
						{saving ? t("common.saving") : t("common.save")}
					</Button>
					<Button variant="outlined" onClick={onReset}>
						{t("userConfig.resetTemplate")}
					</Button>
				</Box>
				{error && (
					<Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}
				{success && (
					<Alert severity="success" sx={{ mt: 1 }}>
						{t("userConfig.saveSuccess")}
					</Alert>
				)}
			</AccordionDetails>
		</Accordion>
	);
}
