import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { ApiTemplateResult, ApiUserConfig } from "../lib/api";
import { userApi } from "../lib/api";
import "uniformize";

interface Props {
	guildId: string;
	initialConfig: ApiUserConfig["userConfig"];
}

export default function UserConfigForm({ guildId, initialConfig }: Props) {
	const { t } = useI18n();

	// --- Snippets state ---
	const [snippets, setSnippets] = useState<Record<string, string>>(
		initialConfig?.snippets ?? {}
	);
	const [newSnippetName, setNewSnippetName] = useState("");
	const [newSnippetValue, setNewSnippetValue] = useState("");
	const [savingSnippets, setSavingSnippets] = useState(false);
	const [snippetSuccess, setSnippetSuccess] = useState(false);
	const [snippetError, setSnippetError] = useState<string | null>(null);

	// --- Attributes state ---
	const [attributes, setAttributes] = useState<Record<string, number>>(
		initialConfig?.attributes ?? {}
	);
	const [newAttrName, setNewAttrName] = useState("");
	const [newAttrValue, setNewAttrValue] = useState<string>("");
	const [savingAttrs, setSavingAttrs] = useState(false);
	const [attrSuccess, setAttrSuccess] = useState(false);
	const [attrError, setAttrError] = useState<string | null>(null);

	// --- Template state ---
	const defaultTemplate: ApiTemplateResult = {
		results: "{{info}} {{result}}",
		final: "[[{{stats}} {{results}}]](<{{link}}>)",
		joinResult: "; ",
		format: {
			name: "__{{stat}}__:",
			info: "{{info}} -",
			dice: "{{dice}}",
			originalDice: "{{original_dice}}",
			character: "{{character}}",
		},
	};
	const [template, setTemplate] = useState<ApiTemplateResult>(
		initialConfig?.createLinkTemplate ?? defaultTemplate
	);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const [templateSuccess, setTemplateSuccess] = useState(false);
	const [templateError, setTemplateError] = useState<string | null>(null);

	// --- Import file refs ---
	const snippetImportRef = useRef<HTMLInputElement>(null);
	const attrImportRef = useRef<HTMLInputElement>(null);

	// --- Export helpers ---
	const exportJson = (data: unknown, filename: string) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	// --- Adding state ---
	const [addingSnippet, setAddingSnippet] = useState(false);
	const [snippetAddError, setSnippetAddError] = useState<string | null>(null);
	const [addingAttr, setAddingAttr] = useState(false);
	const [attrAddError, setAttrAddError] = useState<string | null>(null);

	// --- Snippet handlers ---
	const addSnippet = async () => {
		const name = newSnippetName.trim();
		const value = newSnippetValue.trim();
		if (!name || !value) return;
		setAddingSnippet(true);
		setSnippetAddError(null);
		try {
			const res = await userApi.validateEntries(guildId, "snippets", { [name]: value });
			if (res.data.errors[name] !== undefined) {
				setSnippetAddError(t("userConfig.addInvalidDice", { name }));
				return;
			}
			setSnippets((prev) => ({ ...prev, [name]: value }));
			setNewSnippetName("");
			setNewSnippetValue("");
		} catch {
			setSnippetAddError(t("userConfig.saveError"));
		} finally {
			setAddingSnippet(false);
		}
	};

	const deleteSnippet = (key: string) => {
		setSnippets((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const importSnippets = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const parsed = JSON.parse(reader.result as string);
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
					setSnippetError(t("userConfig.importError"));
					return;
				}
				const res = await userApi.validateEntries(guildId, "snippets", parsed);
				const { valid, errors } = res.data;
				setSnippets((prev) => ({
					...prev,
					...(valid as Record<string, string>),
				}));
				const errCount = Object.keys(errors).length;
				const okCount = Object.keys(valid).length;
				if (errCount > 0) {
					setSnippetError(t("userConfig.importPartial", { ok: okCount, err: errCount }));
				} else if (okCount > 0) {
					setSnippetError(null);
					setSnippetSuccess(true);
					setTimeout(() => setSnippetSuccess(false), 3000);
				}
			} catch {
				setSnippetError(t("userConfig.importError"));
			} finally {
				e.target.value = "";
			}
		};
		reader.readAsText(file);
	};

	const saveSnippets = async () => {
		setSavingSnippets(true);
		setSnippetError(null);
		try {
			await userApi.updateUserConfig(guildId, { snippets });
			setSnippetSuccess(true);
			setTimeout(() => setSnippetSuccess(false), 3000);
		} catch {
			setSnippetError(t("userConfig.saveError"));
		} finally {
			setSavingSnippets(false);
		}
	};

	// --- Attribute handlers ---
	const addAttribute = async () => {
		const name = newAttrName.trim();
		const val = Number.parseFloat(newAttrValue);
		if (!name || Number.isNaN(val)) return;
		setAddingAttr(true);
		setAttrAddError(null);
		try {
			const res = await userApi.validateEntries(guildId, "attributes", { [name]: val });
			if (res.data.errors[name] !== undefined) {
				const msg =
					res.data.errors[name] === "containsHyphen"
						? t("userConfig.attrHyphenError")
						: t("userConfig.addInvalidAttr", { name });
				setAttrAddError(msg);
				return;
			}
			setAttributes((prev) => ({ ...prev, [name]: val }));
			setNewAttrName("");
			setNewAttrValue("");
		} catch {
			setAttrAddError(t("userConfig.saveError"));
		} finally {
			setAddingAttr(false);
		}
	};

	const deleteAttribute = (key: string) => {
		setAttributes((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const importAttributes = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const parsed = JSON.parse(reader.result as string);
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
					setAttrError(t("userConfig.importError"));
					return;
				}
				const res = await userApi.validateEntries(guildId, "attributes", parsed);
				const { valid, errors } = res.data;
				setAttributes((prev) => ({
					...prev,
					...(valid as Record<string, number>),
				}));
				const errCount = Object.keys(errors).length;
				const okCount = Object.keys(valid).length;
				if (errCount > 0) {
					setAttrError(t("userConfig.importPartial", { ok: okCount, err: errCount }));
				} else if (okCount > 0) {
					setAttrError(null);
					setAttrSuccess(true);
					setTimeout(() => setAttrSuccess(false), 3000);
				}
			} catch {
				setAttrError(t("userConfig.importError"));
			} finally {
				e.target.value = "";
			}
		};
		reader.readAsText(file);
	};

	const saveAttributes = async () => {
		setSavingAttrs(true);
		setAttrError(null);
		try {
			await userApi.updateUserConfig(guildId, { attributes });
			setAttrSuccess(true);
			setTimeout(() => setAttrSuccess(false), 3000);
		} catch {
			setAttrError(t("userConfig.saveError"));
		} finally {
			setSavingAttrs(false);
		}
	};

	// --- Template handlers ---
	const saveTemplate = async () => {
		setSavingTemplate(true);
		setTemplateError(null);
		try {
			await userApi.updateUserConfig(guildId, { createLinkTemplate: template });
			setTemplateSuccess(true);
			setTimeout(() => setTemplateSuccess(false), 3000);
		} catch {
			setTemplateError(t("userConfig.saveError"));
		} finally {
			setSavingTemplate(false);
		}
	};

	const resetTemplate = () => setTemplate(defaultTemplate);

	return (
		<Stack spacing={2}>
			{/* Snippets */}
			<Accordion defaultExpanded>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography fontWeight={600}>{t("common.snippets").toTitle()}</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("userConfig.snippetsDesc")}
					</Typography>
					<Stack spacing={1} sx={{ mb: 2 }}>
						{Object.entries(snippets).map(([name, value]) => (
							<Box
								key={name}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									p: 1,
									borderRadius: 1,
									bgcolor: "background.paper",
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								<Typography
									variant="body2"
									fontWeight={600}
									sx={{ minWidth: 120, fontFamily: "var(--code-font-family)" }}
								>
									{name}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ flex: 1, fontFamily: "var(--code-font-family)" }}
								>
									{value}
								</Typography>
								<IconButton size="small" onClick={() => deleteSnippet(name)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Box>
						))}
						{Object.keys(snippets).length === 0 && (
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ fontStyle: "italic", fontFamily: "var(--code-font-family)" }}
							>
								{t("userConfig.noSnippets")}
							</Typography>
						)}
					</Stack>
					<Box sx={{ display: "flex", gap: 1, mb: 1 }}>
						<TextField
							size="small"
							label={t("common.name").toTitle()}
							value={newSnippetName}
							onChange={(e) => {
								setNewSnippetName(e.target.value);
								setSnippetAddError(null);
							}}
							sx={{ flex: 1, fontFamily: "var(--code-font-family)" }}
						/>
						<TextField
							size="small"
							label={t("common.dice").toTitle()}
							value={newSnippetValue}
							onChange={(e) => {
								setNewSnippetValue(e.target.value);
								setSnippetAddError(null);
							}}
							placeholder="2d6+3"
							sx={{ flex: 2, fontFamily: "var(--code-font-family)" }}
							onKeyDown={(e) => e.key === "Enter" && addSnippet()}
						/>
						<Button
							variant="outlined"
							startIcon={addingSnippet ? <CircularProgress size={16} /> : <AddIcon />}
							onClick={addSnippet}
							disabled={
								addingSnippet || !newSnippetName.trim() || !newSnippetValue.trim()
							}
						>
							{t("common.add")}
						</Button>
					</Box>
					{snippetAddError && (
						<Alert
							severity="warning"
							sx={{ mb: 1 }}
							onClose={() => setSnippetAddError(null)}
						>
							{snippetAddError}
						</Alert>
					)}
					{snippetError && (
						<Alert severity="error" sx={{ mb: 1 }} onClose={() => setSnippetError(null)}>
							{snippetError}
						</Alert>
					)}
					{snippetSuccess && (
						<Alert severity="success" sx={{ mb: 1 }}>
							{t("userConfig.saveSuccess")}
						</Alert>
					)}
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						<Button
							variant="contained"
							onClick={saveSnippets}
							disabled={savingSnippets}
							startIcon={savingSnippets ? <CircularProgress size={16} /> : undefined}
						>
							{savingSnippets ? t("common.saving") : t("common.save")}
						</Button>
						<Tooltip title={t("userConfig.exportTooltip")}>
							<span>
								<Button
									variant="outlined"
									startIcon={<FileDownloadIcon />}
									onClick={() => exportJson(snippets, "snippets.json")}
									disabled={Object.keys(snippets).length === 0}
								>
									{t("userConfig.export")}
								</Button>
							</span>
						</Tooltip>
						<input
							ref={snippetImportRef}
							type="file"
							accept=".json,application/json"
							style={{ display: "none" }}
							onChange={importSnippets}
						/>
						<Tooltip title={t("userConfig.importTooltip")}>
							<Button
								variant="outlined"
								startIcon={<FileUploadIcon />}
								onClick={() => snippetImportRef.current?.click()}
							>
								{t("userConfig.import")}
							</Button>
						</Tooltip>
					</Box>
				</AccordionDetails>
			</Accordion>

			{/* Attributes */}
			<Accordion defaultExpanded>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography fontWeight={600}>{t("userConfig.sections.attributes")}</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("userSettings.attributes.description")}
					</Typography>
					<Stack spacing={1} sx={{ mb: 2 }}>
						{Object.entries(attributes).map(([name, value]) => (
							<Box
								key={name}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									p: 1,
									borderRadius: 1,
									bgcolor: "background.paper",
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								<Typography
									variant="body2"
									fontWeight={600}
									sx={{ minWidth: 120, fontFamily: "var(--code-font-family)" }}
								>
									{name}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ flex: 1, fontFamily: "var(--code-font-family)" }}
								>
									{value}
								</Typography>
								<IconButton size="small" onClick={() => deleteAttribute(name)}>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Box>
						))}
						{Object.keys(attributes).length === 0 && (
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ fontStyle: "italic", fontFamily: "var(--code-font-family)" }}
							>
								{t("userConfig.noAttributes")}
							</Typography>
						)}
					</Stack>
					<Box sx={{ display: "flex", gap: 1, mb: 1 }}>
						<TextField
							size="small"
							label={t("common.name").toTitle()}
							value={newAttrName}
							onChange={(e) => {
								setNewAttrName(e.target.value);
								setAttrAddError(null);
							}}
							sx={{ flex: 2, fontFamily: "var(--code-font-family)" }}
						/>
						<TextField
							size="small"
							label={t("userSettings.attributes.create.value.title").toTitle()}
							value={newAttrValue}
							onChange={(e) => {
								setNewAttrValue(e.target.value);
								setAttrAddError(null);
							}}
							type="number"
							sx={{ flex: 1 }}
							onKeyDown={(e) => e.key === "Enter" && addAttribute()}
						/>
						<Button
							variant="outlined"
							startIcon={addingAttr ? <CircularProgress size={16} /> : <AddIcon />}
							onClick={addAttribute}
							disabled={addingAttr || !newAttrName.trim() || newAttrValue === ""}
						>
							{t("common.add")}
						</Button>
					</Box>
					{attrAddError && (
						<Alert
							severity="warning"
							sx={{ mb: 1 }}
							onClose={() => setAttrAddError(null)}
						>
							{attrAddError}
						</Alert>
					)}
					{attrError && (
						<Alert severity="error" sx={{ mb: 1 }} onClose={() => setAttrError(null)}>
							{attrError}
						</Alert>
					)}
					{attrSuccess && (
						<Alert severity="success" sx={{ mb: 1 }}>
							{t("userConfig.saveSuccess")}
						</Alert>
					)}
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						<Button
							variant="contained"
							onClick={saveAttributes}
							disabled={savingAttrs}
							startIcon={savingAttrs ? <CircularProgress size={16} /> : undefined}
						>
							{savingAttrs ? t("common.saving") : t("common.save")}
						</Button>
						<Tooltip title={t("userConfig.exportTooltip")}>
							<span>
								<Button
									variant="outlined"
									startIcon={<FileDownloadIcon />}
									onClick={() => exportJson(attributes, "attributes.json")}
									disabled={Object.keys(attributes).length === 0}
								>
									{t("userConfig.export")}
								</Button>
							</span>
						</Tooltip>
						<input
							ref={attrImportRef}
							type="file"
							accept=".json,application/json"
							style={{ display: "none" }}
							onChange={importAttributes}
						/>
						<Tooltip title={t("userConfig.importTooltip")}>
							<Button
								variant="outlined"
								startIcon={<FileUploadIcon />}
								onClick={() => attrImportRef.current?.click()}
							>
								{t("userConfig.import")}
							</Button>
						</Tooltip>
					</Box>
				</AccordionDetails>
			</Accordion>

			{/* Create Link Template */}
			<Accordion>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography fontWeight={600}>{t("userConfig.sections.template")}</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("userConfig.templateDesc")}
					</Typography>
					<Stack spacing={2}>
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
					</Stack>
					<Box sx={{ display: "flex", gap: 1, mt: 2 }}>
						<Button
							variant="contained"
							onClick={saveTemplate}
							disabled={savingTemplate}
							startIcon={savingTemplate ? <CircularProgress size={16} /> : undefined}
						>
							{savingTemplate ? t("common.saving") : t("common.save")}
						</Button>
						<Button variant="outlined" onClick={resetTemplate}>
							{t("userConfig.resetTemplate")}
						</Button>
					</Box>
					{templateError && (
						<Alert severity="error" sx={{ mt: 1 }} onClose={() => setTemplateError(null)}>
							{templateError}
						</Alert>
					)}
					{templateSuccess && (
						<Alert severity="success" sx={{ mt: 1 }}>
							{t("userConfig.saveSuccess")}
						</Alert>
					)}
				</AccordionDetails>
			</Accordion>
		</Stack>
	);
}
