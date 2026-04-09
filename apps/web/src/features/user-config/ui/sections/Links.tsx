import type { TemplateResult } from "@dicelette/types";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Divider,
	Link,
	TextField,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { type ChangeEvent, type ComponentProps, memo, useCallback, useMemo } from "react";
import type { TemplateSectionProps } from "../../types";
import { FormAccordion } from "../atoms";
import { descriptionSx } from "./styles.ts";

type FormatFieldKey = keyof TemplateResult["format"];

const FORMAT_FIELDS: FormatFieldKey[] = [
	"name",
	"info",
	"dice",
	"originalDice",
	"character",
];
const CODE_FONT_SX = { fontFamily: "var(--code-font-family)" } as const;
const JOIN_FIELD_SX = { maxWidth: 200, fontFamily: "var(--code-font-family)" } as const;
const FORMAT_FIELD_SX = {
	flex: "1 1 200px",
	fontFamily: "var(--code-font-family)",
} as const;
const columnBoxSx = { display: "flex", flexDirection: "column", gap: 2 } as const;
const wrapBoxSx = { display: "flex", flexWrap: "wrap", gap: 2 } as const;
const actionsBoxSx = { display: "flex", gap: 1, mt: 2 } as const;
const alertMtSx = { mt: 1 } as const;

interface TemplateInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	helperText?: string;
	fullWidth?: boolean;
	sx?: ComponentProps<typeof TextField>["sx"];
}

const TemplateInput = memo(function TemplateInput({
	label,
	value,
	onChange,
	helperText,
	fullWidth,
	sx,
}: TemplateInputProps) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
		[onChange]
	);

	return (
		<TextField
			size="small"
			label={label}
			value={value}
			onChange={handleChange}
			helperText={helperText}
			fullWidth={fullWidth}
			sx={sx}
		/>
	);
});

function Links({ state, isTemplate }: TemplateSectionProps) {
	const { t } = useI18n();
	const {
		value: template,
		setValue: setTemplate,
		saving,
		success,
		error,
		setError,
		onSave,
		onReset,
	} = state;

	const updateFinal = useCallback(
		(value: string) => setTemplate((previous) => ({ ...previous, final: value })),
		[setTemplate]
	);
	const updateResults = useCallback(
		(value: string) => setTemplate((previous) => ({ ...previous, results: value })),
		[setTemplate]
	);
	const updateJoinResult = useCallback(
		(value: string) => setTemplate((previous) => ({ ...previous, joinResult: value })),
		[setTemplate]
	);
	const updateFormatField = useCallback(
		(field: FormatFieldKey, value: string) => {
			setTemplate((previous) => ({
				...previous,
				format: { ...previous.format, [field]: value },
			}));
		},
		[setTemplate]
	);
	const formatHandlers = useMemo(
		() => ({
			name: (value: string) => updateFormatField("name", value),
			info: (value: string) => updateFormatField("info", value),
			dice: (value: string) => updateFormatField("dice", value),
			originalDice: (value: string) => updateFormatField("originalDice", value),
			character: (value: string) => updateFormatField("character", value),
		}),
		[updateFormatField]
	);
	const closeError = useCallback(() => setError(null), [setError]);

	return (
		<FormAccordion title={t("userConfig.sections.template")}>
			<Typography variant="body2" color="text.secondary" sx={descriptionSx}>
				{t("userConfig.templateDesc")}
				<br />
				<Link
					color="primary"
					target="_blank"
					rel="noopener noreferrer"
					href={t("userConfig.templateLinkDoc")}
				>
					{t("userConfig.templateDoc")}
				</Link>
			</Typography>
			<Box sx={columnBoxSx}>
				<TemplateInput
					label={t("userConfig.templateFinal")}
					value={template.final}
					onChange={updateFinal}
					fullWidth
					helperText={t("userConfig.templateFinalDesc")}
				/>
				<TemplateInput
					label={t("userConfig.templateResults")}
					value={template.results}
					sx={CODE_FONT_SX}
					onChange={updateResults}
					fullWidth
					helperText={t("userConfig.templateResultsDesc")}
				/>
				<TemplateInput
					label={t("userConfig.templateJoin")}
					value={template.joinResult}
					onChange={updateJoinResult}
					sx={JOIN_FIELD_SX}
				/>
				<Divider />
				<Typography variant="body2" color="text.secondary" sx={CODE_FONT_SX}>
					{t("userConfig.templateFormatSection")}
				</Typography>
				<Box sx={wrapBoxSx}>
					{FORMAT_FIELDS.map((field) => (
						<TemplateInput
							key={field}
							label={t(`userConfig.templateFormat.${field}`)}
							value={template.format[field]}
							onChange={formatHandlers[field]}
							sx={FORMAT_FIELD_SX}
						/>
					))}
				</Box>
			</Box>
			{!isTemplate && (
				<Box sx={actionsBoxSx}>
					<Button
						variant="contained"
						onClick={onSave}
						disabled={saving}
						startIcon={saving ? <CircularProgress size={16} /> : undefined}
					>
						{saving ? t("common.saving") : t("common.save")}
					</Button>
					<Button variant="outlined" onClick={onReset}>
						{t("userSettings.createLink.reset.description")}
					</Button>
				</Box>
			)}
			{error && (
				<Alert severity="error" sx={alertMtSx} onClose={closeError}>
					{error}
				</Alert>
			)}
			{success && (
				<Alert severity="success" sx={alertMtSx}>
					{t("userConfig.saveSuccess")}
				</Alert>
			)}
		</FormAccordion>
	);
}

export default memo(Links);
