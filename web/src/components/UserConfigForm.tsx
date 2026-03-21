import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useI18n } from "../i18n";
import type { ApiTemplateResult, ApiUserConfig } from "../lib/api";
import { userApi } from "../lib/api";

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

	// --- Snippet handlers ---
	const addSnippet = () => {
		const name = newSnippetName.trim();
		const value = newSnippetValue.trim();
		if (!name || !value) return;
		setSnippets((prev) => ({ ...prev, [name]: value }));
		setNewSnippetName("");
		setNewSnippetValue("");
	};

	const deleteSnippet = (key: string) => {
		setSnippets((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
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
	const addAttribute = () => {
		const name = newAttrName.trim();
		const val = Number.parseFloat(newAttrValue);
		if (!name || Number.isNaN(val)) return;
		setAttributes((prev) => ({ ...prev, [name]: val }));
		setNewAttrName("");
		setNewAttrValue("");
	};

	const deleteAttribute = (key: string) => {
		setAttributes((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
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
					<Typography fontWeight={600}>{t("userConfig.sections.snippets")}</Typography>
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
									sx={{ minWidth: 120, fontFamily: "monospace" }}
								>
									{name}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ flex: 1, fontFamily: "monospace" }}
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
								sx={{ fontStyle: "italic" }}
							>
								{t("userConfig.noSnippets")}
							</Typography>
						)}
					</Stack>
					<Box sx={{ display: "flex", gap: 1, mb: 2 }}>
						<TextField
							size="small"
							label={t("userConfig.snippetName")}
							value={newSnippetName}
							onChange={(e) => setNewSnippetName(e.target.value)}
							sx={{ flex: 1 }}
							inputProps={{ style: { fontFamily: "monospace" } }}
						/>
						<TextField
							size="small"
							label={t("userConfig.snippetDice")}
							value={newSnippetValue}
							onChange={(e) => setNewSnippetValue(e.target.value)}
							placeholder="2d6+3"
							sx={{ flex: 2 }}
							inputProps={{ style: { fontFamily: "monospace" } }}
							onKeyDown={(e) => e.key === "Enter" && addSnippet()}
						/>
						<Button
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={addSnippet}
							disabled={!newSnippetName.trim() || !newSnippetValue.trim()}
						>
							{t("common.add")}
						</Button>
					</Box>
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
					<Button
						variant="contained"
						onClick={saveSnippets}
						disabled={savingSnippets}
						startIcon={savingSnippets ? <CircularProgress size={16} /> : undefined}
					>
						{savingSnippets ? t("common.saving") : t("common.save")}
					</Button>
				</AccordionDetails>
			</Accordion>

			{/* Attributes */}
			<Accordion defaultExpanded>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography fontWeight={600}>{t("userConfig.sections.attributes")}</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{t("userConfig.attributesDesc")}
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
									sx={{ minWidth: 120, fontFamily: "monospace" }}
								>
									{name}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ flex: 1, fontFamily: "monospace" }}
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
								sx={{ fontStyle: "italic" }}
							>
								{t("userConfig.noAttributes")}
							</Typography>
						)}
					</Stack>
					<Box sx={{ display: "flex", gap: 1, mb: 2 }}>
						<TextField
							size="small"
							label={t("userConfig.attrName")}
							value={newAttrName}
							onChange={(e) => setNewAttrName(e.target.value)}
							sx={{ flex: 2 }}
							inputProps={{ style: { fontFamily: "monospace" } }}
						/>
						<TextField
							size="small"
							label={t("userConfig.attrValue")}
							value={newAttrValue}
							onChange={(e) => setNewAttrValue(e.target.value)}
							type="number"
							sx={{ flex: 1 }}
							onKeyDown={(e) => e.key === "Enter" && addAttribute()}
						/>
						<Button
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={addAttribute}
							disabled={!newAttrName.trim() || newAttrValue === ""}
						>
							{t("common.add")}
						</Button>
					</Box>
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
					<Button
						variant="contained"
						onClick={saveAttributes}
						disabled={savingAttrs}
						startIcon={savingAttrs ? <CircularProgress size={16} /> : undefined}
					>
						{savingAttrs ? t("common.saving") : t("common.save")}
					</Button>
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
							inputProps={{ style: { fontFamily: "monospace" } }}
							helperText="{{stats}} {{results}} {{link}}"
						/>
						<TextField
							size="small"
							label={t("userConfig.templateResults")}
							value={template.results}
							onChange={(e) => setTemplate((p) => ({ ...p, results: e.target.value }))}
							fullWidth
							inputProps={{ style: { fontFamily: "monospace" } }}
							helperText="{{info}} {{result}}"
						/>
						<TextField
							size="small"
							label={t("userConfig.templateJoin")}
							value={template.joinResult}
							onChange={(e) => setTemplate((p) => ({ ...p, joinResult: e.target.value }))}
							sx={{ maxWidth: 200 }}
							inputProps={{ style: { fontFamily: "monospace" } }}
						/>
						<Divider />
						<Typography variant="body2" color="text.secondary">
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
									sx={{ flex: "1 1 200px" }}
									inputProps={{ style: { fontFamily: "monospace" } }}
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
