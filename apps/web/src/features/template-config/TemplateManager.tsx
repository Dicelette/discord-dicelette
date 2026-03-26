import type { StatisticalTemplate } from "@dicelette/core";
import { charactersApi, templateApi } from "@dicelette/dashboard-api";
import {
	Casino,
	Check,
	CheckCircle,
	Close,
	Delete,
	Download,
	Functions,
	SmsFailed,
	Upload,
} from "@mui/icons-material";
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
	Pagination,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { getChannelPathById, type Props, SectionTitle, useI18n } from "@shared";
import { useEffect, useState } from "react";
import { exportJson } from "../user-config/utils.ts";
import { TemplateModal } from "./sections";
import type { ImportTemplateData } from "./types.ts";

export default function TemplateManager({
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
	const [template, setTemplate] = useState<StatisticalTemplate | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [importModalOpen, setImportModalOpen] = useState(false);
	const [hasCharacters, setHasCharacters] = useState(false);
	const [templateChannelId, setTemplateChannelId] = useState(defaultTemplateChannelId);
	const [publicChannelId, setPublicChannelId] = useState(defaultPublicChannelId);
	const [privateChannelId, setPrivateChannelId] = useState(defaultPrivateChannelId);

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

	useEffect(() => {
		setTemplateChannelId(defaultTemplateChannelId);
	}, [defaultTemplateChannelId]);

	useEffect(() => {
		setPublicChannelId(defaultPublicChannelId);
	}, [defaultPublicChannelId]);

	useEffect(() => {
		setPrivateChannelId(defaultPrivateChannelId);
	}, [defaultPrivateChannelId]);

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
			setTemplateChannelId(data.channelId);
			setPublicChannelId(data.publicChannelId || undefined);
			setPrivateChannelId(data.privateChannelId || undefined);
			flash(setSuccess, t("template.importSuccess"));
		} catch (e) {
			flash(setError, t("template.importError"));
			console.error(e);
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
				<Button
					variant="outlined"
					startIcon={<Download />}
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
							startIcon={<Upload />}
							onClick={() => exportJson(template, "template.json")}
							size="small"
						>
							{t("export.name").toTitle()}
						</Button>
						{hasCharacters && (
							<Button
								variant="outlined"
								startIcon={<Upload />}
								onClick={handleExportCharacters}
								size="small"
							>
								{t("template.exportCharacters")}
							</Button>
						)}
						<Button
							variant="outlined"
							color="error"
							startIcon={<Delete />}
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
					defaultTemplateChannel={getChannelPathById(templateChannelId, channels)}
					defaultPrivateChannel={getChannelPathById(privateChannelId, channels)}
					defaultPublicChannel={getChannelPathById(publicChannelId, channels)}
				/>
			)}

			<TemplateModal
				open={importModalOpen}
				onClose={() => setImportModalOpen(false)}
				onImport={handleModalImport}
				channels={channels}
				hasCharacters={hasCharacters}
				defaultTemplateChannelId={templateChannelId}
				defaultPublicChannelId={publicChannelId}
				defaultPrivateChannelId={privateChannelId}
			/>

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
	const rowsPerPage = 10;
	const [customCriticalPage, setCustomCriticalPage] = useState(1);
	const [statisticsPage, setStatisticsPage] = useState(1);
	const [damagePage, setDamagePage] = useState(1);

	const customCriticalEntries = Object.entries(template.customCritical ?? {});
	const statisticsEntries = Object.entries(template.statistics ?? {});
	const damageEntries = Object.entries(template.damage ?? {});

	useEffect(() => {
		const maxCustomCriticalPage = Math.max(
			1,
			Math.ceil(customCriticalEntries.length / rowsPerPage)
		);
		const maxStatisticsPage = Math.max(
			1,
			Math.ceil(statisticsEntries.length / rowsPerPage)
		);
		const maxDamagePage = Math.max(1, Math.ceil(damageEntries.length / rowsPerPage));

		if (customCriticalPage > maxCustomCriticalPage) {
			setCustomCriticalPage(maxCustomCriticalPage);
		}
		if (statisticsPage > maxStatisticsPage) {
			setStatisticsPage(maxStatisticsPage);
		}
		if (damagePage > maxDamagePage) {
			setDamagePage(maxDamagePage);
		}
	}, [
		customCriticalEntries.length,
		statisticsEntries.length,
		damageEntries.length,
		customCriticalPage,
		statisticsPage,
		damagePage,
	]);

	const tableHeadSx = {
		"& .MuiTableCell-root": {
			backgroundColor: "action.selected",
			fontWeight: 700,
		},
	};
	const channelInfos = [
		{ label: t("config.defaultSheet"), value: defaultPublicChannel },
		{ label: t("config.fields.privateChannel"), value: defaultPrivateChannel },
		{ label: t("template.templateChannel"), value: defaultTemplateChannel },
	];

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
									icon={<CheckCircle />}
									label={`${template.critical.success}`}
									color="success"
									size="small"
								/>
							)}
							{template.critical.failure !== undefined && (
								<Chip
									icon={<SmsFailed />}
									label={`${template.critical.failure}`}
									color="error"
									size="small"
								/>
							)}
						</Box>
					</Paper>
				)}

			{customCriticalEntries.length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("config.customCritical")}
					</Typography>
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 620 }}>
							<TableHead sx={tableHeadSx}>
								<TableRow>
									<TableCell align={"center"}>{t("common.name").toTitle()}</TableCell>
									<TableCell align={"center"}>{t("calc.sign.title").toTitle()}</TableCell>
									<TableCell align={"center"}>{t("modals.dice.value")}</TableCell>
									<TableCell align={"center"}>{t("template.onNaturalDice")}</TableCell>
									<TableCell align={"center"}>{t("template.affectSkill")}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{customCriticalEntries
									.slice(
										(customCriticalPage - 1) * rowsPerPage,
										customCriticalPage * rowsPerPage
									)
									.map(([name, crit]) => (
										<TableRow key={name}>
											<TableCell>
												<strong>{name}</strong>
											</TableCell>
											<TableCell>
												<code style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
													{crit.sign}
												</code>
											</TableCell>
											<TableCell>
												<code>{crit.value}</code>
											</TableCell>
											<TableCell>{crit.onNaturalDice ? "✓" : "—"}</TableCell>
											<TableCell>{crit.affectSkill ? "✓" : "—"}</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
					{customCriticalEntries.length > rowsPerPage && (
						<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
							<Pagination
								count={Math.ceil(customCriticalEntries.length / rowsPerPage)}
								page={customCriticalPage}
								onChange={(_, page) => setCustomCriticalPage(page)}
								size="small"
							/>
						</Box>
					)}
				</Paper>
			)}

			{statisticsEntries.length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.statistics").toTitle()}
					</Typography>
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 700 }}>
							<TableHead sx={tableHeadSx}>
								<TableRow>
									<TableCell align={"center"}>
										<strong>{t("common.name").toTitle()}</strong>
									</TableCell>
									<TableCell align={"center"}>
										<strong>{t("graph.min.name").toTitle()}</strong>
									</TableCell>
									<TableCell align={"center"}>
										<strong>{t("graph.max.name").toTitle()}</strong>
									</TableCell>
									<TableCell align={"center"}>
										<strong>{t("template.formula")}</strong>
									</TableCell>
									<TableCell align={"center"}>
										<strong>{t("register.embed.exclude")}</strong>
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{statisticsEntries
									.slice((statisticsPage - 1) * rowsPerPage, statisticsPage * rowsPerPage)
									.map(([name, stat]) => (
										<TableRow key={name}>
											<TableCell>{name}</TableCell>
											<TableCell align={"center"}>
												<code>{stat.min ?? "—"}</code>
											</TableCell>
											<TableCell align={"center"}>
												<code>{stat.max ?? "—"}</code>
											</TableCell>
											<TableCell align={"center"}>
												<code style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
													{stat.combinaison ?? "—"}
												</code>
											</TableCell>
											<TableCell align={"center"}>
												{stat.exclude ? <Check /> : <Close />}
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
					{statisticsEntries.length > rowsPerPage && (
						<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
							<Pagination
								count={Math.ceil(statisticsEntries.length / rowsPerPage)}
								page={statisticsPage}
								onChange={(_, page) => setStatisticsPage(page)}
								size="small"
							/>
						</Box>
					)}
				</Paper>
			)}

			{damageEntries.length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.macro").toTitle()}
					</Typography>
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: 420 }}>
							<TableHead sx={tableHeadSx}>
								<TableRow>
									<TableCell>{t("common.name").toTitle()}</TableCell>
									<TableCell>{t("template.formula")}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{damageEntries
									.slice((damagePage - 1) * rowsPerPage, damagePage * rowsPerPage)
									.map(([name, formula]) => (
										<TableRow key={name}>
											<TableCell>{name}</TableCell>
											<TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
												{formula || "—"}
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
					{damageEntries.length > rowsPerPage && (
						<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
							<Pagination
								count={Math.ceil(damageEntries.length / rowsPerPage)}
								page={damagePage}
								onChange={(_, page) => setDamagePage(page)}
								size="small"
							/>
						</Box>
					)}
				</Paper>
			)}
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
					<Chip
						icon={<Casino />}
						sx={{ fontFamily: "var(--code-font-family)" }}
						label={`${template.diceType}`}
						size="small"
					/>
				)}
				{template.total !== undefined && (
					<Chip
						icon={<Functions />}
						sx={{ fontFamily: "var(--code-font-family)" }}
						label={`${template.total}`}
						size="small"
					/>
				)}
				{template.forceDistrib && (
					<Chip
						label={t("register.embed.forceDistrib")}
						size="small"
						color="warning"
						variant="outlined"
					/>
				)}
			</Box>
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
									label={value ?? t("common.none")}
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
									title={value ?? t("common.none")}
								/>
							</Box>
						);
					})}
				</Box>
			</Paper>
		</Box>
	);
}
