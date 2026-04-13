import {
	type CustomCritical as CustomCriticalType,
	getEngine,
	type Statistic,
	type StatisticalSchema,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import { Box, Tab, Tabs, useMediaQuery, useTheme } from "@mui/material";
import { useI18n } from "@shared";
import { Form, Formik, type FormikHelpers } from "formik";
import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import { CompactContext } from "./Atoms/CompactContext";
import CriticalValue from "./Blocks/CriticalValue";
import CustomCritical from "./Blocks/customCritical";
import General from "./Blocks/General";
import Macro from "./Blocks/Macro";
import Statistics from "./Blocks/Statistics";
import { errorCode } from "./errorsTranslation";
import type { DataForm } from "./interfaces";
import { createFormItemId, isNumber } from "./utils";

const engine = getEngine("browserCrypto");

type TemplateTab = "general" | "statistics" | "macros" | "customCritical";

const tabsSx = { mb: 2, borderBottom: 1, borderColor: "divider" } as const;
const hiddenSx = { display: "none" } as const;
const visibleSx = {} as const;

export const INITIAL_VALUES: DataForm = {
	isCharNameRequired: false,
	isPrivate: false,
	statistics: [],
	total: "",
	diceType: "",
	critical: { success: "", failure: "" },
	damages: [],
	customCritical: [],
	forceDistrib: false,
};

function parseNumber(nb?: unknown): number | undefined {
	if (nb === null || nb === undefined || !isNumber(nb)) return undefined;
	const parsed = Number.parseInt(nb.toString(), 10);
	if (Number.isNaN(parsed)) return undefined;
	return parsed;
}

/** Converts DataForm (form state) to a validated StatisticalTemplate. Throws on validation error. */
export function dataFormToTemplate(data: DataForm): StatisticalTemplate {
	const stat: Statistic = {};
	const diceSkill: Record<string, string> = {};
	const customCritical: Record<string, CustomCriticalType> = {};

	if (data.statistics.length > 0) {
		for (const statistic of data.statistics) {
			stat[statistic.name] = {
				combinaison: statistic.combinaison,
				max: parseNumber(statistic.max),
				min: parseNumber(statistic.min),
				exclude: statistic.excluded,
			};
		}
	}
	if (data.damages.length > 0) {
		for (const damage of data.damages) {
			diceSkill[damage.name] = damage.value;
		}
	}
	if (data.customCritical.length > 0) {
		for (const critical of data.customCritical) {
			customCritical[critical.name] = {
				sign: critical.selection,
				value: critical.formula,
				onNaturalDice: critical.onNaturalDice,
				affectSkill: critical.affectSkill,
			};
		}
	}

	const templateDataValues: StatisticalSchema = {
		charName: data.isCharNameRequired,
		forceDistrib: data.forceDistrib,
		critical: {
			success:
				data.critical?.success && isNumber(data.critical.success)
					? Number.parseInt(data.critical.success.toString(), 10)
					: undefined,
			failure:
				data.critical?.failure && isNumber(data.critical.failure)
					? Number.parseInt(data.critical.failure.toString(), 10)
					: undefined,
		},
		diceType: data.diceType,
		total: parseNumber(data.total),
		statistics: data.statistics.length > 0 ? stat : undefined,
		damage: data.damages.length > 0 ? diceSkill : undefined,
		customCritical: data.customCritical.length > 0 ? customCritical : undefined,
	};

	return verifyTemplateValue(templateDataValues, true, engine);
}

/** Maps a StatisticalTemplate back to the form's DataForm shape. */
export function mapSchemaToFormValues(
	schema: StatisticalTemplate,
	current: DataForm = INITIAL_VALUES
): DataForm {
	const statisticsArray = schema.statistics
		? Object.entries(schema.statistics).map(([name, value]) => ({
				id: createFormItemId("stat"),
				name,
				combinaison: value.combinaison,
				min: value.min?.toString(),
				max: value.max?.toString(),
				excluded: value.exclude,
			}))
		: [];

	const damagesArray = schema.damage
		? Object.entries(schema.damage).map(([name, value]) => ({
				id: createFormItemId("macro"),
				name,
				value,
			}))
		: [];

	const customCriticalArray = schema.customCritical
		? Object.entries(schema.customCritical).map(([name, value]) => ({
				id: createFormItemId("cc"),
				name,
				selection: value.sign as CustomCriticalType["sign"],
				formula: value.value,
				text: "",
				onNaturalDice: Boolean(value.onNaturalDice),
				affectSkill: Boolean(value.affectSkill),
			}))
		: [];

	return {
		...current,
		isCharNameRequired: Boolean(schema.charName ?? current.isCharNameRequired),
		forceDistrib: Boolean(schema.forceDistrib ?? current.forceDistrib),
		diceType: schema.diceType ?? current.diceType,
		total: schema.total ?? current.total,
		critical: {
			success: schema.critical?.success ?? current.critical?.success ?? "",
			failure: schema.critical?.failure ?? current.critical?.failure ?? "",
		},
		statistics: statisticsArray,
		damages: damagesArray,
		customCritical: customCriticalArray,
	};
}

// ─── component ─────────────────────────────────────────────────────────────────

export interface TemplateFormProps {
	/** Pre-populate the form with an existing template (edit mode). */
	initialTemplate?: StatisticalTemplate;
	/** Called on submit with the validated template. Caller sends to the server. */
	onSave: (template: StatisticalTemplate) => Promise<void>;
	/** Bubble validation/conversion errors up to the parent modal. */
	onError: (message: string) => void;
	/** HTML id for the <form> — allows an external submit button via form={formId}. */
	formId?: string;
}

const TemplateForm: FC<TemplateFormProps> = ({
	initialTemplate,
	onSave,
	onError,
	formId,
}) => {
	const { t } = useI18n();
	// Single media-query call: all button children read this via CompactContext.
	const theme = useTheme();
	const isNarrow = useMediaQuery(theme.breakpoints.down("xl"));
	const [activeTab, setActiveTab] = useState<TemplateTab>("general");

	const initialValues = useMemo<DataForm>(
		() => (initialTemplate ? mapSchemaToFormValues(initialTemplate) : INITIAL_VALUES),
		// Re-derive only when the template reference changes (modal open/close)
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[initialTemplate]
	);

	const handleSubmit = useCallback(
		async (values: DataForm, { setSubmitting }: FormikHelpers<DataForm>) => {
			try {
				await onSave(dataFormToTemplate(values));
			} catch (error) {
				onError(errorCode(error, t));
			} finally {
				setSubmitting(false);
			}
		},
		[onSave, onError, t]
	);

	return (
		<CompactContext.Provider value={isNarrow}>
			<Formik initialValues={initialValues} enableReinitialize onSubmit={handleSubmit}>
				{({ values, setFieldValue }) => (
					<Form id={formId}>
						<Tabs
							value={activeTab}
							onChange={(_, v: TemplateTab) => setActiveTab(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={tabsSx}
						>
							<Tab value="general" label={t("template.general")} />
							<Tab value="statistics" label={t("template.statistics")} />
							<Tab value="macros" label={t("template.macros")} />
							<Tab value="customCritical" label={t("template.customCritical")} />
						</Tabs>

						<Box sx={activeTab === "general" ? visibleSx : hiddenSx}>
							<General />
							<CriticalValue critical={values.critical ?? { success: "", failure: "" }} />
						</Box>
						<Box sx={activeTab === "statistics" ? visibleSx : hiddenSx}>
							<Statistics values={values} setFieldValue={setFieldValue} />
						</Box>
						<Box sx={activeTab === "macros" ? visibleSx : hiddenSx}>
							<Macro values={values} setFieldValue={setFieldValue} />
						</Box>
						<Box sx={activeTab === "customCritical" ? visibleSx : hiddenSx}>
							<CustomCritical values={values} setFieldValue={setFieldValue} />
						</Box>
					</Form>
				)}
			</Formik>
		</CompactContext.Provider>
	);
};

export default TemplateForm;
