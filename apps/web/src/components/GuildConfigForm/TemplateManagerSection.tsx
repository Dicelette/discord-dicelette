import {
	getEngine,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { charactersApi, templateApi } from "../../lib/api";
import { exportJson } from "../UserConfigForm/utils";
import SectionTitle from "./atoms/SectionTitle";
import ImportTemplateModal, { type ImportTemplateData } from "./ImportTemplateModal";
import type { Props } from "./types";

export default function TemplateManagerSection({
	guildId,
	channels,
	defaultPublicChannelId,
	defaultPrivateChannelId,
	defaultTemplateChannelId,
}: Props & {
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
	defaultTemplateChannelId?: string;
}) {
	const { t } = useI18n();
	const fileRef = useRef<HTMLInputElement>(null);
	const [template, setTemplate] = useState<StatisticalTemplate | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [importModalOpen, setImportModalOpen] = useState(false);
	const [hasCharacters, setHasCharacters] = useState(false);

	const flash = (setter: (v: string | null) => void, msg: string) => {
		setter(msg);
		setTimeout(() => setter(null), 3000);
	};

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		Promise.all([
			templateApi
				.get(guildId, { signal })
				.then((r) => {
					if (!signal.aborted) setTemplate(r.data);
				})
				.catch(() => {
					if (!signal.aborted) setTemplate(null);
				}),
			charactersApi
				.count(guildId, { signal })
				.then((r) => {
					if (!signal.aborted) setHasCharacters(r.data.count > 0);
				})
				.catch(() => {}),
		]).finally(() => {
			if (!signal.aborted) setLoading(false);
		});
		return () => {
			controller.abort();
		};
	}, [guildId]);

	// Import depuis le modal (premier enregistrement — avec sélection des canaux)
	const handleModalImport = async (data: ImportTemplateData) => {
		setSaving(true);
		try {
			if (data.deleteCharacters) {
				await charactersApi.bulkDelete(guildId);
				setHasCharacters(false);
			}
			await templateApi.import(guildId, {
				template: data.template,
				channelId: data.channelId,
				publicChannelId: data.publicChannelId,
				privateChannelId: data.privateChannelId,
			});
			setTemplate(data.template);
			flash(setSuccess, t("template.importSuccess"));
		} finally {
			setSaving(false);
		}
	};

	// Import direct depuis un fichier (mise à jour — template déjà présent)
	const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = "";
		setSaving(true);
		try {
			const json = JSON.parse(await file.text());
			const engine = getEngine("browserCrypto");
			const validated = verifyTemplateValue(json, true, engine);
			await templateApi.import(guildId, { template: validated });
			setTemplate(validated);
			flash(setSuccess, t("template.importSuccess"));
		} catch {
			flash(setError, t("template.importError"));
		} finally {
			setSaving(false);
		}
	};

	const handleExportCharacters = async () => {
		try {
			const res = await charactersApi.exportCsv(guildId);
			const url = URL.createObjectURL(res.data);
			const a = document.createElement("a");
			a.href = url;
			a.download = "characters.csv";
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			flash(setError, t("template.exportCharactersError"));
		}
	};

	const handleDelete = async () => {
		setConfirmDelete(false);
		setSaving(true);
		try {
			await templateApi.delete(guildId);
			setTemplate(null);
			flash(setSuccess, t("template.deleteSuccess"));
		} catch {
			flash(setError, t("template.deleteError"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<SectionTitle>{t("common.template").toTitle()}</SectionTitle>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{success && (
				<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
					{success}
				</Alert>
			)}

			<Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
				{/* Fichier caché pour la mise à jour (template déjà présent) */}
				<input
					ref={fileRef}
					type="file"
					accept=".json,application/json"
					style={{ display: "none" }}
					onChange={handleFileImport}
				/>

				<Button
					variant="outlined"
					startIcon={<DownloadIcon />}
					onClick={() => setImportModalOpen(true)}
					disabled={saving || loading}
					size="small"
				>
					{t("import.name").toTitle()}
				</Button>

				{template && (
					<>
						<Button
							variant="outlined"
							startIcon={<UploadIcon />}
							onClick={() => exportJson(template, "template.json")}
							size="small"
						>
							{t("export.name").toTitle()}
						</Button>
						{hasCharacters && (
							<Button
								variant="outlined"
								startIcon={<UploadIcon />}
								onClick={handleExportCharacters}
								size="small"
							>
								{t("template.exportCharacters")}
							</Button>
						)}
						<Button
							variant="outlined"
							color="error"
							startIcon={<DeleteIcon />}
							onClick={() => setConfirmDelete(true)}
							disabled={saving}
							size="small"
						>
							{t("template.delete")}
						</Button>
					</>
				)}
			</Box>

			{loading ? (
				<CircularProgress size={24} />
			) : !template ? (
				<Typography variant="body2" color="text.secondary">
					{t("config.noTemplate")}
				</Typography>
			) : (
				<TemplateView
					template={template}
					defaultTemplateChannel={
						channels.find((c) => c.id === defaultTemplateChannelId)?.name
					}
					defaultPrivateChannel={
						channels.find((c) => c.id === defaultPrivateChannelId)?.name
					}
					defaultPublicChannel={
						channels.find((c) => c.id === defaultPublicChannelId)?.name
					}
				/>
			)}

			{/* Modal d'import initial */}
			<ImportTemplateModal
				open={importModalOpen}
				onClose={() => setImportModalOpen(false)}
				onImport={handleModalImport}
				channels={channels}
				hasCharacters={hasCharacters}
				defaultPublicChannelId={defaultPublicChannelId}
				defaultPrivateChannelId={defaultPrivateChannelId}
			/>

			{/* Confirmation suppression */}
			<Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
				<DialogTitle>{t("template.deleteConfirmTitle")}</DialogTitle>
				<DialogContent>
					<Typography>{t("template.deleteConfirmBody")}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button>
					<Button color="error" variant="contained" onClick={handleDelete}>
						{t("template.delete")}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}

function TemplateView({
	template,
	defaultPublicChannel,
	defaultPrivateChannel,
	defaultTemplateChannel,
}: {
	template: StatisticalTemplate;
	defaultPublicChannel?: string;
	defaultPrivateChannel?: string;
	defaultTemplateChannel?: string;
}) {
	const { t } = useI18n();
	const channelInfos = [
		{ label: t("config.defaultSheet"), value: defaultPublicChannel },
		{ label: t("config.fields.privateChannel"), value: defaultPrivateChannel },
		{ label: t("template.templateChannel"), value: defaultTemplateChannel },
	];

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Infos générales */}
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
				{template.charName && (
					<Chip
						label={t("template.charName")}
						size="small"
						color="primary"
						variant="outlined"
					/>
				)}
				{template.diceType && (
					<Chip label={`${t("template.diceType")}: ${template.diceType}`} size="small" />
				)}
				{template.total !== undefined && (
					<Chip label={`${t("common.total")}: ${template.total}`} size="small" />
				)}
				{template.forceDistrib && (
					<Chip
						label={t("register.embed.forceDistrib")}
						size="small"
						color="secondary"
						variant="outlined"
					/>
				)}
			</Box>

			{/* Critiques standard */}
			{template.critical &&
				(template.critical.success !== undefined ||
					template.critical.failure !== undefined) && (
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
							{t("template.critical")}
						</Typography>
						<Box sx={{ display: "flex", gap: 1 }}>
							{template.critical.success !== undefined && (
								<Chip
									label={`✓ ${template.critical.success}`}
									color="success"
									size="small"
								/>
							)}
							{template.critical.failure !== undefined && (
								<Chip
									label={`✗ ${template.critical.failure}`}
									color="error"
									size="small"
								/>
							)}
						</Box>
					</Paper>
				)}

			{/* Critiques personnalisés */}
			{template.customCritical && Object.keys(template.customCritical).length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("config.customCritical")}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("common.name").toTitle()}</TableCell>
								<TableCell>{t("calc.sign.title").toTitle()}</TableCell>
								<TableCell>{t("modals.dice.value")}</TableCell>
								<TableCell>{t("template.onNaturalDice")}</TableCell>
								<TableCell>{t("template.affectSkill")}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{Object.entries(template.customCritical).map(([name, crit]) => (
								<TableRow key={name}>
									<TableCell>{name}</TableCell>
									<TableCell>
										<code>{crit.sign}</code>
									</TableCell>
									<TableCell>{crit.value}</TableCell>
									<TableCell>{crit.onNaturalDice ? "✓" : "—"}</TableCell>
									<TableCell>{crit.affectSkill ? "✓" : "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Paper>
			)}

			{/* Statistiques */}
			{template.statistics && Object.keys(template.statistics).length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.statistics").toTitle()}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("common.name").toTitle()}</TableCell>
								<TableCell>{t("graph.min.name").toTitle()}</TableCell>
								<TableCell>{t("graph.max.name").toTitle()}</TableCell>
								<TableCell>{t("template.formula")}</TableCell>
								<TableCell>{t("register.embed.exclude")}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{Object.entries(template.statistics).map(([name, stat]) => (
								<TableRow key={name}>
									<TableCell>{name}</TableCell>
									<TableCell>{stat.min ?? "—"}</TableCell>
									<TableCell>{stat.max ?? "—"}</TableCell>
									<TableCell>{stat.combinaison ?? "—"}</TableCell>
									<TableCell>{stat.exclude ? "✓" : "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Paper>
			)}

			{/* Dés de compétence */}
			{template.damage && Object.keys(template.damage).length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.macro").toTitle()}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("common.name").toTitle()}</TableCell>
								<TableCell>{t("template.formula")}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{Object.entries(template.damage).map(([name, formula]) => (
								<TableRow key={name}>
									<TableCell>{name}</TableCell>
									<TableCell>{formula || "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Paper>
			)}
			{/* Channel, privée + où est la template, pour référence uniquement, ne peut pas être changé sauf modif de la template par le modal */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, minmax(0, 1fr))",
							md: "repeat(3, minmax(0, 1fr))",
						},
						gap: 1,
					}}
				>
					{channelInfos.map(({ label, value }) => {
						const isMissing = !value;
						return (
							<Box
								key={label}
								sx={{
									border: 1,
									borderColor: "divider",
									borderRadius: 1,
									p: 1.25,
									minHeight: 68,
								}}
							>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block", mb: 0.5, textAlign: "center" }}
								>
									{label}
								</Typography>
								<Chip
									size="small"
									label={value ? `#${value}` : t("common.none")}
									variant={isMissing ? "outlined" : "filled"}
									sx={{
										maxWidth: "100%",
										display: "flex",
										mx: "auto",
										fontWeight: 600,
										opacity: isMissing ? 0.6 : 1,
										borderColor: isMissing ? "action.disabledBackground" : undefined,
										color: isMissing ? "text.secondary" : undefined,
										bgcolor: isMissing ? "action.hover" : undefined,
										"& .MuiChip-label": {
											display: "block",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										},
										"&:hover": value
											? {
													transform: "translateY(-1px)",
													boxShadow: 1,
													bgcolor: isMissing ? "action.selected" : "primary.dark",
												}
											: {},
									}}
									title={value ? `#${value}` : t("common.none")}
								/>
							</Box>
						);
					})}
				</Box>
			</Paper>
		</Box>
	);
}
