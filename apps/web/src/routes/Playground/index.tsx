import "../../shims/dice-engine";
import "uniformize";

import { SortOrder, validateCustomFormula } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import {
	applyCustomFormula,
	getExpression,
	isRolling,
	parseComparator,
	ResultAsText,
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
	type ComparisonSign,
	DiscordMarkdown,
	DocsButton,
	LanguageSelect,
	SIGN_OPTIONS,
	ThemeToggleButton,
	TransWithLink,
	useI18n,
	useLocalStorageState,
} from "@shared";
import { useCallback, useMemo, useState } from "react";
import { AttributeRow } from "../../features/user-config";
import {
	DEFAULT_OPTIONS,
	FAKE_AUTHOR_ID,
	FAKE_GUILD,
	FAKE_MESSAGEID,
	FAKE_SAVE_CHANNEL,
	SORT_OPTIONS,
} from "./constants";
import DashboardButton from "./DashboardButton.tsx";
import {
	boxBaseSx,
	headerBoxSx,
	logoBoxSx,
	mainBoxSx,
	paperSx,
	stackSx,
	summarySx,
	summaryTitleSx,
	toolbarBoxSx,
} from "./styles";
import type { CustomCriticalEntry, PlaygroundOptions, SectionKey } from "./types";
import {
	buildCustomCriticals,
	buildStats,
	newCustomCritical,
	parseNumber,
	toDiscordLocale,
	withStat,
} from "./utils";

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
		statistics,
		customCriticals,
		open,
	} = options;

	// Transient inputs for the "add statistic" row (not persisted).
	const [newStatName, setNewStatName] = useState("");
	const [newStatValue, setNewStatValue] = useState("");

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
	// Attribute-style handlers over the stat record, mirroring AttributeRow's
	// contract (rename returns an error string or null, value/delete by name).
	const renameStat = useCallback(
		(oldName: string, rawName: string): string | null => {
			const name = rawName.trim();
			if (!name) return t("template.errors.shared.emptyName");
			if (
				name !== oldName &&
				Object.keys(options.statistics).some(
					(k) => k.toLowerCase() === name.toLowerCase()
				)
			)
				return t("template.errors.shared.duplicateName");
			setOptions((o) => {
				const next: Record<string, string> = {};
				for (const [k, v] of Object.entries(o.statistics))
					next[k === oldName ? name : k] = v;
				return { ...o, statistics: next };
			});
			return null;
		},
		[options.statistics, setOptions, t]
	);
	const setStatValue = useCallback(
		(name: string, value: string) =>
			setOptions((o) => ({ ...o, statistics: { ...o.statistics, [name]: value } })),
		[setOptions]
	);
	const deleteStat = useCallback(
		(name: string) =>
			setOptions((o) => {
				const next = { ...o.statistics };
				delete next[name];
				return { ...o, statistics: next };
			}),
		[setOptions]
	);
	const addStat = useCallback(() => {
		if (!newStatName.trim()) return;
		setOptions((o) => ({
			...o,
			statistics: withStat(o.statistics, newStatName, newStatValue),
		}));
		setNewStatName("");
		setNewStatValue("");
	}, [newStatName, newStatValue, setOptions]);

	// Sort-order options for the Autocomplete, mirroring the dashboard's General.tsx.
	const sortOrders = useMemo(
		() => SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
		[t]
	);

	// Roll-affecting inputs (including statistics) are snapshotted here only when
	// "Roll" is pressed, so typing in the dice/formula fields or editing a stat
	// value never triggers a fresh (random) roll on its own.
	// Lazy-init from the restored options so the result matches on first load.
	const [rollInput, setRollInput] = useState(() => ({
		expression,
		customFormula,
		disableCompare,
		sort: sortOrder,
		statistics,
	}));
	const [copied, setCopied] = useState(false);

	const doRoll = () => {
		// Fold a stat typed in the add row but not yet "Added" so it still applies.
		if (newStatName.trim()) addStat();
		setRollInput({
			expression,
			customFormula,
			disableCompare,
			sort: sortOrder,
			statistics: withStat(statistics, newStatName, newStatValue),
		});
	};

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
				// Free-text mode has no "expression" option to feed getExpression, so
				// `{exp}`/`{exp||X}` macros (e.g. inside a custom-formula `[...]` bracket)
				// can only fall back to their default value here.
				content = getExpression(content, "0").dice;
				content = applyCustomFormula(content, formula);
			}
			// User statistics referenced in the dice via `$name`. Passing them lets the
			// engine substitute the value (e.g. `1d20+$force` → `1d20+3`) like the bot.
			// Snapshotted, so editing a stat value only applies on the next roll.
			const { stats, statsName } = buildStats(rollInput.statistics);
			const userData = statsName.length ? { stats, template: {} } : undefined;
			const isRoll = isRolling(
				content,
				userData,
				statsName.length ? statsName : undefined,
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
				diceCriticals:
					rollCustomCriticalsFromDice(
						content,
						ul,
						undefined,
						userData?.stats,
						rollInput.sort
					) ?? {},
				opposition: parseComparator(
					content,
					userData?.stats,
					isRoll.infoRoll,
					rollInput.sort
				),
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
					<DashboardButton />
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
							<span />
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

					{/* ── Section 3: Statistiques ── */}
					<Accordion
						expanded={open.statistics}
						onChange={(_, v) => setSection("statistics", v)}
					>
						<AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
							<Typography sx={summaryTitleSx}>
								{t("playground.sections.statistics")}
							</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={2}>
								<Typography variant="body2" sx={{ color: "text.secondary" }}>
									{t("playground.statistics.helper")}
								</Typography>
								{Object.entries(statistics).map(([name, value]) => (
									<AttributeRow
										key={name}
										name={name}
										value={value}
										allData={statistics}
										onRename={renameStat}
										onValueChange={setStatValue}
										onDelete={deleteStat}
									/>
								))}
								<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
									<TextField
										label={t("template.name")}
										value={newStatName}
										onChange={(e) => setNewStatName(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && addStat()}
										size="small"
										sx={{ flex: 2 }}
									/>
									<TextField
										label={t("userConfig.attrValue")}
										value={newStatValue}
										onChange={(e) => setNewStatValue(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && addStat()}
										size="small"
										sx={{ flex: 1 }}
									/>
									<Button
										size="small"
										startIcon={<Add />}
										onClick={addStat}
										disabled={!newStatName.trim()}
									>
										{t("common.add")}
									</Button>
								</Stack>
							</Stack>
						</AccordionDetails>
					</Accordion>

					{/* ── Section 4: Critiques ── */}
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
												updateCustomCritical(cc.id, {
													sign: e.target.value as ComparisonSign,
												})
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
