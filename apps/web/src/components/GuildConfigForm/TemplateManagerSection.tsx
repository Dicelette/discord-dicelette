import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
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
import { templateApi } from "../../lib/api";
import { exportJson } from "../UserConfigForm/utils";
import SectionTitle from "./SectionTitle";

export default function TemplateManagerSection({ guildId }: { guildId: string }) {
	const { t } = useI18n();
	const fileRef = useRef<HTMLInputElement>(null);
	const [template, setTemplate] = useState<StatisticalTemplate | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const flash = (setter: (v: string | null) => void, msg: string) => {
		setter(msg);
		setTimeout(() => setter(null), 3000);
	};

	useEffect(() => {
		let cancelled = false;
		templateApi
			.get(guildId)
			.then((r) => {
				if (!cancelled) setTemplate(r.data);
			})
			.catch(() => {
				if (!cancelled) setTemplate(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [guildId]);

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = "";
		try {
			const json = JSON.parse(await file.text());
			const validated = verifyTemplateValue(json);
			setSaving(true);
			await templateApi.import(guildId, validated);
			setTemplate(validated);
			flash(setSuccess, t("template.importSuccess"));
		} catch {
			flash(setError, t("template.importError"));
		} finally {
			setSaving(false);
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
			<SectionTitle>{t("template.section")}</SectionTitle>

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
				<input
					ref={fileRef}
					type="file"
					accept=".json,application/json"
					style={{ display: "none" }}
					onChange={handleImport}
				/>
				<Button
					variant="outlined"
					startIcon={<UploadIcon />}
					onClick={() => fileRef.current?.click()}
					disabled={saving}
					size="small"
				>
					{t("template.import")}
				</Button>
				{template && (
					<>
						<Button
							variant="outlined"
							startIcon={<DownloadIcon />}
							onClick={() => exportJson(template, "template.json")}
							size="small"
						>
							{t("template.export")}
						</Button>
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
					{t("template.none")}
				</Typography>
			) : (
				<TemplateView template={template} />
			)}

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

function TemplateView({ template }: { template: StatisticalTemplate }) {
	const { t } = useI18n();

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
					<Chip label={`${t("template.total")}: ${template.total}`} size="small" />
				)}
				{template.forceDistrib && (
					<Chip
						label={t("template.forceDistrib")}
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
						{t("template.customCritical")}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("template.name")}</TableCell>
								<TableCell>{t("template.sign")}</TableCell>
								<TableCell>{t("template.value")}</TableCell>
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
						{t("template.statistics")}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("template.name")}</TableCell>
								<TableCell>Min</TableCell>
								<TableCell>Max</TableCell>
								<TableCell>{t("template.formula")}</TableCell>
								<TableCell>{t("template.excluded")}</TableCell>
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
						{t("template.damage")}
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("template.name")}</TableCell>
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
		</Box>
	);
}
