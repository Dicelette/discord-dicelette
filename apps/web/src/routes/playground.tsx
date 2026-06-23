// The dice engine swap MUST be imported before any roll happens. Keeping it as
// the first import guarantees the browser-safe RNG is installed at module load.
import "../shims/dice-engine";
// Brings the `String.prototype.standardize` augmentation used below (and the
// matching global types) into scope.
import "uniformize";

import { type CustomCritical, SortOrder, validateCustomFormula } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import {
	applyCustomFormula,
	isRolling,
	parseComparator,
	parseCustomCritical,
	ResultAsText,
	rollCustomCritical,
	rollCustomCriticalsFromDice,
	type Server,
} from "@dicelette/parse_result";
import {
	Add,
	Casino,
	Check,
	ContentCopy,
	DeleteOutlined,
	ExpandMore,
} from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	IconButton,
	MenuItem,
	Paper,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	DiscordMarkdown,
	DocsButton,
	LanguageSelect,
	ThemeToggleButton,
	TransWithLink,
	useI18n,
	useLocalStorageState,
} from "@shared";
import { Locale } from "discord-api-types/v10";
import { useCallback, useMemo, useState } from "react";

const headerBoxSx = { px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } } as const;
const toolbarBoxSx = {
	width: "100%",
	display: "flex",
	justifyContent: "flex-end",
	alignItems: "center",
	gap: 1,
	flexWrap: "wrap",
} as const;
const mainBoxSx = { px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 6 } } as const;
const stackSx = { maxWidth: 720, mx: "auto" } as const;
const paperSx = { p: 3 } as const;
const summarySx = { bgcolor: "action.hover" } as const;
const summaryTitleSx = { fontWeight: 600 } as const;
const logoBoxSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 1.5,
	mb: 1,
} as const;
const boxBaseSx = {
	mt: 0.5,
	p: 2,
	borderRadius: 1,
	bgcolor: "var(--bg-default)",
	border: "1px solid",
	borderColor: "divider",
	minHeight: 48,
} as const;

/** Maps the web UI locale to the Discord `Locale` the formatter expects. */
function toDiscordLocale(locale: "en" | "fr"): Locale {
	return locale === "en" ? Locale.EnglishUS : Locale.French;
}

// Stand-in ids for fake Discord entities used in the preview output.
const FAKE_AUTHOR_ID = "0".repeat(18);
const FAKE_SAVE_CHANNEL = "2".repeat(18);
const FAKE_GUILD = "1".repeat(18);
const FAKE_MESSAGEID = "3".repeat(18);

const SIGN_OPTIONS = [">", ">=", "<", "<=", "==", "!="] as const;

const SORT_OPTIONS: { value: SortOrder; labelKey: string }[] = [
	{ value: SortOrder.Ascending, labelKey: "config.sort.options.ascending" },
	{ value: SortOrder.Descending, labelKey: "config.sort.options.descending" },
];

/** A custom critical row, mirroring the template editor (name + sign + formula). */
type CustomCriticalEntry = {
	id: string;
	name: string;
	sign: string;
	formula: string;
	onNaturalDice: boolean;
};

/** The four collapsible option sections. */
type SectionKey = "general" | "character" | "criticals" | "display";

/**
 * Every persisted playground option in a single object — mirrors the dashboard's
 * `useForm({ defaultValues })`, so one `useLocalStorageState` replaces ~17.
 */
type PlaygroundOptions = {
	expression: string;
	pseudo: string;
	criticalSuccess: string;
	criticalFailure: string;
	charName: string;
	statName: string;
	customFormula: string;
	timestamp: boolean;
	disableCompare: boolean;
	sortOrder: SortOrder;
	showContext: boolean;
	showSaveLink: boolean;
	customCriticals: CustomCriticalEntry[];
	open: Record<SectionKey, boolean>;
};

const DEFAULT_OPTIONS: PlaygroundOptions = {
	expression: "1d20+5>=15",
	pseudo: "",
	criticalSuccess: "",
	criticalFailure: "",
	charName: "",
	statName: "",
	customFormula: "",
	timestamp: false,
	disableCompare: false,
	sortOrder: SortOrder.None,
	showContext: false,
	showSaveLink: false,
	customCriticals: [],
	open: { general: false, character: false, criticals: false, display: false },
};

function newCustomCritical(): CustomCriticalEntry {
	return {
		id: crypto.randomUUID(),
		name: "",
		sign: ">=",
		formula: "",
		onNaturalDice: false,
	};
}

/**
 * Builds the rolled custom-critical record the formatter expects from the UI
 * rows, reusing the bot's `parseCustomCritical` + `rollCustomCritical`.
 */
function buildCustomCriticals(
	entries: CustomCriticalEntry[]
): Record<string, CustomCritical> {
	const record: Record<string, CustomCritical> = {};
	for (const cc of entries) {
		const name = cc.name.trim();
		const formula = cc.formula.trim();
		if (!name || !formula) continue;
		const prefixed = cc.onNaturalDice ? `(N)${name}` : name;
		const parsed = parseCustomCritical(prefixed, `${cc.sign}${formula}`);
		if (parsed) Object.assign(record, parsed);
	}
	return rollCustomCritical(record) ?? {};
}

function parseNumber(value: string): number | undefined {
	if (value.trim() === "") return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

export default function Playground() {
	const { t, locale } = useI18n();

	// A single persisted object holds every option (see PlaygroundOptions).
	const [options, setOptions] = useLocalStorageState(
		"playground:options",
		DEFAULT_OPTIONS
	);
	const {
		expression,
		pseudo,
		criticalSuccess,
		criticalFailure,
		charName,
		statName,
		customFormula,
		timestamp,
		disableCompare,
		sortOrder,
		showContext,
		showSaveLink,
		customCriticals,
		open,
	} = options;

	// Generic field setter — `update("charName", "Bob")`. Stable across renders.
	const update = useCallback(
		<K extends keyof PlaygroundOptions>(key: K, value: PlaygroundOptions[K]) =>
			setOptions((o) => ({ ...o, [key]: value })),
		[setOptions]
	);
	const setSection = useCallback(
		(key: SectionKey, value: boolean) =>
			setOptions((o) => ({ ...o, open: { ...o.open, [key]: value } })),
		[setOptions]
	);
	const updateCustomCritical = useCallback(
		(id: string, patch: Partial<CustomCriticalEntry>) =>
			setOptions((o) => ({
				...o,
				customCriticals: o.customCriticals.map((c) =>
					c.id === id ? { ...c, ...patch } : c
				),
			})),
		[setOptions]
	);

	// Sort-order options for the Autocomplete, mirroring the dashboard's General.tsx.
	const sortOrders = useMemo(
		() => SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
		[t]
	);

	// Roll-affecting inputs are snapshotted here only when "Roll" is pressed, so
	// typing in the dice/formula fields never triggers a fresh (random) roll.
	// Lazy-init from the restored options so the result matches on first load.
	const [rollInput, setRollInput] = useState(() => ({
		expression,
		customFormula,
		disableCompare,
		sort: sortOrder,
	}));
	const [copied, setCopied] = useState(false);

	const doRoll = () =>
		setRollInput({ expression, customFormula, disableCompare, sort: sortOrder });

	// The actual (random) roll. Reused as the bot does for free-text rolls:
	// isRolling handles inline opposition, comments, criticals and disableCompare.
	// Driven by `rollInput`, which only changes when "Roll" is pressed — so typing
	// in the dice/formula fields, or editing a display option below, never re-rolls.
	const rolled = useMemo(() => {
		let content = rollInput.expression.trim();
		if (!content) return { kind: "empty" as const };
		const lang = toDiscordLocale(locale);
		const ul = ln(lang);
		try {
			// Custom formula: a mathjs expression where `$` stands for each `[value]`
			// bracket in the dice (e.g. dice `1d20<=[15]` + formula `$-2` → `1d20<=13`).
			const formula = rollInput.customFormula.trim();
			if (formula) {
				const valid = validateCustomFormula(formula);
				if (!valid.ok)
					return {
						kind: "error" as const,
						message: t("config.fields.customFormulaInvalid", {
							error: "error" in valid ? String(valid.error) : "",
						}),
					};
				content = applyCustomFormula(content, formula);
			}
			const isRoll = isRolling(
				content,
				undefined,
				undefined,
				false,
				rollInput.disableCompare,
				rollInput.sort,
				ul
			);
			if (!isRoll?.result) return { kind: "invalid" as const };
			return {
				kind: "ok" as const,
				content,
				lang,
				isRoll,
				// Criticals written inline in the dice (`{cs:}{cf:}`); the list-based
				// ones are merged in the format memo so editing them doesn't re-roll.
				diceCriticals: rollCustomCriticalsFromDice(content, ul) ?? {},
				opposition: parseComparator(content, undefined, undefined, undefined),
			};
		} catch (e) {
			return {
				kind: "error" as const,
				message: e instanceof Error ? e.message : String(e),
			};
		}
	}, [rollInput, locale, t]);

	// Re-formats the current roll whenever a display option changes (no re-roll).
	const { output, error } = useMemo(() => {
		if (rolled.kind === "empty") return { output: "", error: false };
		if (rolled.kind === "invalid")
			return { output: t("playground.result.invalid"), error: true };
		if (rolled.kind === "error") return { output: rolled.message, error: true };
		try {
			const success = parseNumber(criticalSuccess);
			const failure = parseNumber(criticalFailure);
			const critical =
				success !== undefined || failure !== undefined ? { success, failure } : undefined;
			const autoStat = rolled.isRoll.infoRoll;
			const statSource = statName.trim() || autoStat;
			const infoRoll = statSource
				? { name: statSource, standardized: statSource.standardize() }
				: undefined;
			const merged = {
				...rolled.diceCriticals,
				...buildCustomCriticals(customCriticals),
			};
			const customCritical = Object.keys(merged).length ? merged : undefined;
			const data: Server = {
				lang: rolled.lang,
				config: { timestamp },
				dice: rolled.content,
			};
			const formatter = new ResultAsText(
				rolled.isRoll.result,
				data,
				critical,
				charName.trim() || undefined,
				infoRoll,
				customCritical,
				rolled.opposition,
				rolled.isRoll.statsPerSegment
			);
			const contextArg:
				| { guildId: string; channelId: string; messageId: string }
				| string
				| undefined = showSaveLink
				? `<#${FAKE_SAVE_CHANNEL}>`
				: showContext
					? {
							guildId: FAKE_GUILD,
							channelId: FAKE_SAVE_CHANNEL,
							messageId: FAKE_MESSAGEID,
						}
					: undefined;
			const message = formatter.error
				? formatter.output
				: formatter.onMessageSend(contextArg, FAKE_AUTHOR_ID).trimStart();
			return { output: message, error: !!formatter.error };
		} catch (e) {
			return { output: e instanceof Error ? e.message : String(e), error: true };
		}
	}, [
		rolled,
		criticalSuccess,
		criticalFailure,
		charName,
		statName,
		customCriticals,
		timestamp,
		showContext,
		showSaveLink,
		t,
	]);

	const hasOutput = output.length > 0;
	const renderedBoxSx = { ...boxBaseSx, ...(error ? { color: "error.main" } : {}) };
	const pseudoName = pseudo.trim() || t("playground.options.pseudoDefault");
	const mentions = { [FAKE_AUTHOR_ID]: pseudoName };

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard may be unavailable (e.g. insecure context); ignore.
		}
	};

	const title = "Dicelette Playground";
	const description =
		"Try the Dicelette dice parser live: roll dice, tweak the options and preview exactly how results appear on Discord.";

	return (
		<Box className="min-h-screen flex flex-col">
			<meta charSet="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0, viewport-fit=cover"
			/>
			<title>Dicelette Playground</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={title} />
			<meta name="twitter:title" content={title} />
			<meta property="og:description" content={description} />
			<Box sx={headerBoxSx}>
				<Box sx={toolbarBoxSx}>
					<DocsButton color="default" />
					<ThemeToggleButton color="default" />
					<LanguageSelect />
				</Box>
			</Box>
			<Box sx={mainBoxSx}>
				<Stack spacing={2} sx={stackSx}>
					{/* ── Page header ── */}
					<Box>
						<Box sx={logoBoxSx}>
							<img
								src="/logo.png"
								alt="Dicelette"
								style={{ height: 40, width: 40, objectFit: "contain" }}
							/>
							<Typography variant="h5" sx={{ fontWeight: 700 }}>
								{t("playground.title")}
							</Typography>
						</Box>
						<Typography
							variant="body2"
							sx={{ color: "text.secondary", textAlign: "center" }}
						>
							{t("playground.subtitle")}
						</Typography>
					</Box>

					{/* ── Expression + Roll ── */}
					<Paper sx={paperSx}>
						<Stack spacing={2}>
							<TextField
								label={t("playground.expression.label")}
								placeholder={t("playground.expression.placeholder")}
								value={expression}
								onChange={(e) => update("expression", e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") doRoll();
								}}
								fullWidth
								autoFocus
								helperText={t("playground.expression.helper")}
							/>
							<Button
								variant="contained"
								startIcon={<Casino />}
								onClick={doRoll}
								sx={{ textTransform: "none" }}
							>
								{t("playground.roll")}
							</Button>
						</Stack>
					</Paper>
					{/* ── Résultat ── */}
					<Paper sx={paperSx}>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mb: 1,
							}}
						>
							<Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
								{t("playground.result.rendered")}
							</Typography>
							<Tooltip
								title={t(copied ? "playground.result.copied" : "playground.result.copy")}
							>
								<span>
									<IconButton size="small" onClick={handleCopy} disabled={!hasOutput}>
										{copied ? (
											<Check fontSize="small" color="success" />
										) : (
											<ContentCopy fontSize="small" />
										)}
									</IconButton>
								</span>
							</Tooltip>
						</Box>
						<Box sx={renderedBoxSx}>
							{hasOutput ? (
								<DiscordMarkdown
									content={output}
									mentions={mentions}
									threads={{ [FAKE_SAVE_CHANNEL]: "Playground Thread" }}
								/>
							) : (
								<Typography variant="body2" sx={{ color: "text.secondary" }}>
									{t("playground.result.empty")}
								</Typography>
							)}
						</Box>
					</Paper>

					{/* ── Section 1: Générale ── */}
					<Accordion
						expanded={open.general}
						onChange={(_, v) => setSection("general", v)}
					>
						<AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
							<Typography sx={summaryTitleSx}>
								{t("playground.sections.general")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={2}>
								<TextField
									label={t("config.fields.customFormula")}
									placeholder="$ * 2"
									value={customFormula}
									onChange={(e) => update("customFormula", e.target.value)}
									helperText={
										<TransWithLink
											i18nKey="playground.options.customFormulaHelper"
											href="https://mathjs.org"
											linkText="Mathjs"
										/>
									}
									fullWidth
								/>
								<Autocomplete
									fullWidth
									size="small"
									options={sortOrders}
									getOptionLabel={(s) => s.label}
									value={sortOrders.find((s) => s.value === sortOrder) ?? null}
									onChange={(_, newValue) =>
										update("sortOrder", newValue?.value ?? SortOrder.None)
									}
									renderInput={(params) => (
										<TextField
											{...params}
											label={t("config.fields.sortOrder")}
											slotProps={{
												...params.slotProps,
												input: { ...params.slotProps.input },
												htmlInput: {
													...params.slotProps.htmlInput,
													readOnly: true,
												},
											}}
										/>
									)}
								/>
								<FormControlLabel
									control={
										<Switch
											checked={disableCompare}
											onChange={(e) => update("disableCompare", e.target.checked)}
										/>
									}
									label={t("playground.options.disableCompare")}
								/>
							</Stack>
						</AccordionDetails>
					</Accordion>

					{/* ── Section 2: Personnage ── */}
					<Accordion
						expanded={open.character}
						onChange={(_, v) => setSection("character", v)}
					>
						<AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
							<Typography sx={summaryTitleSx}>
								{t("playground.sections.character")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={2}>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
									<TextField
										label={t("playground.options.pseudo")}
										placeholder={t("playground.options.pseudoDefault")}
										value={pseudo}
										onChange={(e) => update("pseudo", e.target.value)}
										fullWidth
									/>
									<TextField
										label={t("playground.options.charName")}
										value={charName}
										onChange={(e) => update("charName", e.target.value)}
										fullWidth
									/>
								</Stack>
								<TextField
									label={t("playground.options.statName")}
									value={statName}
									onChange={(e) => update("statName", e.target.value)}
									fullWidth
								/>
							</Stack>
						</AccordionDetails>
					</Accordion>

					{/* ── Section 3: Critiques ── */}
					<Accordion
						expanded={open.criticals}
						onChange={(_, v) => setSection("criticals", v)}
					>
						<AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
							<Typography sx={summaryTitleSx}>
								{t("playground.sections.criticals")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={2}>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
									<TextField
										label={t("roll.critical.success")}
										value={criticalSuccess}
										onChange={(e) => update("criticalSuccess", e.target.value)}
										type="number"
										helperText={t("playground.onNaturalDice")}
										fullWidth
									/>
									<TextField
										label={t("roll.critical.failure")}
										value={criticalFailure}
										onChange={(e) => update("criticalFailure", e.target.value)}
										type="number"
										helperText={t("playground.onNaturalDice")}
										fullWidth
									/>
								</Stack>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<Typography variant="subtitle2">
										{t("template.customCritical")}
									</Typography>
									<Button
										size="small"
										startIcon={<Add />}
										onClick={() =>
											setOptions((o) => ({
												...o,
												customCriticals: [...o.customCriticals, newCustomCritical()],
											}))
										}
									>
										{t("common.add")}
									</Button>
								</Box>
								{customCriticals.map((cc) => (
									<Stack
										key={cc.id}
										direction={{ xs: "column", sm: "row" }}
										spacing={1}
										sx={{ alignItems: "center" }}
									>
										<TextField
											label={t("template.name")}
											value={cc.name}
											onChange={(e) =>
												updateCustomCritical(cc.id, { name: e.target.value })
											}
											size="small"
											sx={{ flex: 1 }}
										/>
										<TextField
											select
											label={t("template.sign")}
											value={cc.sign}
											onChange={(e) =>
												updateCustomCritical(cc.id, { sign: e.target.value })
											}
											size="small"
											sx={{ minWidth: 80 }}
										>
											{SIGN_OPTIONS.map((s) => (
												<MenuItem key={s} value={s}>
													{s}
												</MenuItem>
											))}
										</TextField>
										<TextField
											label={t("template.formula")}
											value={cc.formula}
											onChange={(e) =>
												updateCustomCritical(cc.id, { formula: e.target.value })
											}
											size="small"
											sx={{ flex: 1 }}
										/>
										<Tooltip title={t("playground.onNaturalDice")}>
											<Checkbox
												checked={cc.onNaturalDice}
												onChange={(e) =>
													updateCustomCritical(cc.id, {
														onNaturalDice: e.target.checked,
													})
												}
												icon={<Casino fontSize="small" color="disabled" />}
												checkedIcon={<Casino fontSize="small" color="primary" />}
											/>
										</Tooltip>
										<IconButton
											aria-label={t("template.delete")}
											onClick={() =>
												setOptions((o) => ({
													...o,
													customCriticals: o.customCriticals.filter(
														(c) => c.id !== cc.id
													),
												}))
											}
										>
											<DeleteOutlined fontSize="small" />
										</IconButton>
									</Stack>
								))}
							</Stack>
						</AccordionDetails>
					</Accordion>

					{/* ── Section 4: Affichage ── */}
					<Accordion
						expanded={open.display}
						onChange={(_, v) => setSection("display", v)}
					>
						<AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
							<Typography sx={summaryTitleSx}>
								{t("playground.sections.display")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={1}>
								<FormControlLabel
									control={
										<Switch
											checked={timestamp}
											onChange={(e) => update("timestamp", e.target.checked)}
										/>
									}
									label={t("playground.options.timestamp")}
								/>
								<Divider />
								<Typography variant="subtitle2" sx={{ pt: 0.5, color: "text.secondary" }}>
									{t("playground.sections.contextLinks")}
								</Typography>
								<FormControlLabel
									control={
										<Switch
											checked={showContext}
											onChange={(e) =>
												setOptions((o) => ({
													...o,
													showContext: e.target.checked,
													showSaveLink: e.target.checked ? false : o.showSaveLink,
												}))
											}
										/>
									}
									label={t("playground.options.context")}
								/>
								<FormControlLabel
									control={
										<Switch
											checked={showSaveLink}
											onChange={(e) =>
												setOptions((o) => ({
													...o,
													showSaveLink: e.target.checked,
													showContext: e.target.checked ? false : o.showContext,
												}))
											}
										/>
									}
									label={t("playground.options.saveLink")}
								/>
							</Stack>
						</AccordionDetails>
					</Accordion>
				</Stack>
			</Box>
		</Box>
	);
}
