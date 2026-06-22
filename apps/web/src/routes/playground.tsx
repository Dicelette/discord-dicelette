// The dice engine swap MUST be imported before any roll happens. Keeping it as
// the first import guarantees the browser-safe RNG is installed at module load.
import "../shims/dice-engine";
// Brings the `String.prototype.standardize` augmentation used below (and the
// matching global types) into scope.
import "uniformize";

import { type CustomCritical, validateCustomFormula } from "@dicelette/core";
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
import { Add, Casino, Check, ContentCopy, DeleteOutlined } from "@mui/icons-material";
import {
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Collapse,
	Divider,
	FormControlLabel,
	IconButton,
	MenuItem,
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
} from "@shared";
import { Locale } from "discord-api-types/v10";
import { useMemo, useState } from "react";

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
const cardSx = { maxWidth: 720, width: "100%", mx: "auto" } as const;
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

// Stand-in author id so the output carries a `<@id>` mention like a real
// Discord message; the id only keys the fake pseudo in the rendered view.
const FAKE_AUTHOR_ID = "000000000000000000";

const SIGN_OPTIONS = [">", ">=", "<", "<=", "==", "!="] as const;

/** A custom critical row, mirroring the template editor (name + sign + formula). */
type CustomCriticalEntry = {
	id: string;
	name: string;
	sign: string;
	formula: string;
	onNaturalDice: boolean;
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

	const [expression, setExpression] = useState("1d20+5>=15");
	const [showOptions, setShowOptions] = useState(false);
	const [pseudo, setPseudo] = useState("");
	const [criticalSuccess, setCriticalSuccess] = useState("");
	const [criticalFailure, setCriticalFailure] = useState("");
	const [charName, setCharName] = useState("");
	const [statName, setStatName] = useState("");
	const [customFormula, setCustomFormula] = useState("");
	const [timestamp, setTimestamp] = useState(false);
	const [disableCompare, setDisableCompare] = useState(false);
	const [customCriticals, setCustomCriticals] = useState<CustomCriticalEntry[]>([]);
	// Roll-affecting inputs are snapshotted here only when "Roll" is pressed, so
	// typing in the dice/formula fields never triggers a fresh (random) roll.
	const [rollInput, setRollInput] = useState({
		expression: "1d20+5>=15",
		customFormula: "",
		disableCompare: false,
	});
	const [copied, setCopied] = useState(false);

	// Captures the current roll-affecting inputs and produces a new roll. A fresh
	// object reference is created on every press, so re-pressing "Roll" with the
	// same inputs still re-rolls.
	const doRoll = () => setRollInput({ expression, customFormula, disableCompare });

	const updateCustomCritical = (id: string, patch: Partial<CustomCriticalEntry>) =>
		setCustomCriticals((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

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
			// Mirrors the bot's per-user/guild formula (on_message_send.ts).
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
				undefined,
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
			// Merge the dice's inline `{cs:}{cf:}` criticals with the custom-criticals list.
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
			// Pass a fake author id so the message carries a `<@id>` mention like a
			// real Discord roll; it renders as the pseudo in the "Rendered" view.
			const message = formatter.error
				? formatter.output
				: formatter.onMessageSend(undefined, FAKE_AUTHOR_ID).trimStart();
			return {
				output: message,
				error: !!formatter.error,
			};
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
			<meta name="twitter:description" content={description} />
			<Box sx={headerBoxSx}>
				<Box sx={toolbarBoxSx}>
					<DocsButton color="default" />
					<ThemeToggleButton color="default" />
					<LanguageSelect />
				</Box>
			</Box>
			<Box className="flex-1 flex items-start justify-center" sx={mainBoxSx}>
				<Card sx={cardSx}>
					<CardContent className="p-8">
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
							sx={{ color: "text.secondary", textAlign: "center", mb: 3 }}
						>
							{t("playground.subtitle")}
						</Typography>

						<Stack spacing={2}>
							<TextField
								label={t("playground.expression.label")}
								placeholder={t("playground.expression.placeholder")}
								value={expression}
								onChange={(e) => setExpression(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") doRoll();
								}}
								fullWidth
								autoFocus
								helperText={t("playground.expression.helper")}
							/>

							<Box>
								<Button
									variant="text"
									size="small"
									onClick={() => setShowOptions((v) => !v)}
								>
									{showOptions
										? t("playground.options.hide")
										: t("playground.options.show")}
								</Button>
								<Collapse in={showOptions}>
									<Stack spacing={2} sx={{ pt: 1 }}>
										<TextField
											label={t("config.fields.customFormula")}
											placeholder="$ * 2"
											value={customFormula}
											onChange={(e) => setCustomFormula(e.target.value)}
											helperText={
												<TransWithLink
													i18nKey="playground.options.customFormulaHelper"
													href="https://mathjs.org"
													linkText="Mathjs"
												/>
											}
											fullWidth
										/>
										<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
											<TextField
												label={t("roll.critical.success")}
												value={criticalSuccess}
												onChange={(e) => setCriticalSuccess(e.target.value)}
												type="number"
												helperText={t("playground.onNaturalDice")}
												fullWidth
											/>
											<TextField
												label={t("roll.critical.failure")}
												value={criticalFailure}
												onChange={(e) => setCriticalFailure(e.target.value)}
												type="number"
												helperText={t("playground.onNaturalDice")}
												fullWidth
											/>
										</Stack>
										<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
											<TextField
												label={t("playground.options.pseudo")}
												placeholder={t("playground.options.pseudoDefault")}
												value={pseudo}
												onChange={(e) => setPseudo(e.target.value)}
												fullWidth
											/>
											<TextField
												label={t("playground.options.charName")}
												value={charName}
												onChange={(e) => setCharName(e.target.value)}
												fullWidth
											/>
										</Stack>
										<TextField
											label={t("playground.options.statName")}
											value={statName}
											onChange={(e) => setStatName(e.target.value)}
											fullWidth
										/>
										<FormControlLabel
											control={
												<Switch
													checked={timestamp}
													onChange={(e) => setTimestamp(e.target.checked)}
												/>
											}
											label={t("playground.options.timestamp")}
										/>
										<FormControlLabel
											control={
												<Switch
													checked={disableCompare}
													onChange={(e) => setDisableCompare(e.target.checked)}
												/>
											}
											label={t("playground.options.disableCompare")}
										/>

										<Divider />
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
													setCustomCriticals((list) => [...list, newCustomCritical()])
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
														setCustomCriticals((list) =>
															list.filter((c) => c.id !== cc.id)
														)
													}
												>
													<DeleteOutlined fontSize="small" />
												</IconButton>
											</Stack>
										))}
									</Stack>
								</Collapse>
							</Box>

							<Button
								variant="contained"
								startIcon={<Casino />}
								onClick={doRoll}
								sx={{ textTransform: "none" }}
							>
								{t("playground.roll")}
							</Button>
						</Stack>

						<Divider sx={{ mt: 3 }} />

						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mt: 2,
							}}
						>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
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
								<DiscordMarkdown content={output} mentions={mentions} />
							) : (
								<Typography variant="body2" sx={{ color: "text.secondary" }}>
									{t("playground.result.empty")}
								</Typography>
							)}
						</Box>
					</CardContent>
				</Card>
			</Box>
		</Box>
	);
}
