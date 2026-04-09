import type { StatisticalTemplate } from "@dicelette/core";
import {
	Casino,
	Check,
	CheckCircle,
	Close,
	Functions,
	SmsFailed,
} from "@mui/icons-material";
import {
	Box,
	Chip,
	Paper,
	TableCell,
	TableRow,
	Typography,
} from "@mui/material";
import { useI18n } from "@shared";
import { useEffect, useState } from "react";
import { PaginatedTable } from "../atoms";

const ROWS_PER_PAGE = 10;

interface Props {
	template: StatisticalTemplate;
	defaultPublicChannel?: string;
	defaultPrivateChannel?: string;
	defaultTemplateChannel?: string;
}

export default function TemplateView({
	template,
	defaultPublicChannel,
	defaultPrivateChannel,
	defaultTemplateChannel,
}: Props) {
	const { t } = useI18n();
	const [customCriticalPage, setCustomCriticalPage] = useState(1);
	const [statisticsPage, setStatisticsPage] = useState(1);
	const [damagePage, setDamagePage] = useState(1);

	const customCriticalEntries = Object.entries(template.customCritical ?? {});
	const statisticsEntries = Object.entries(template.statistics ?? {});
	const damageEntries = Object.entries(template.damage ?? {});

	useEffect(() => {
		const maxCC = Math.max(1, Math.ceil(customCriticalEntries.length / ROWS_PER_PAGE));
		const maxStat = Math.max(1, Math.ceil(statisticsEntries.length / ROWS_PER_PAGE));
		const maxDmg = Math.max(1, Math.ceil(damageEntries.length / ROWS_PER_PAGE));
		if (customCriticalPage > maxCC) setCustomCriticalPage(maxCC);
		if (statisticsPage > maxStat) setStatisticsPage(maxStat);
		if (damagePage > maxDmg) setDamagePage(maxDmg);
	}, [
		customCriticalEntries.length,
		statisticsEntries.length,
		damageEntries.length,
		customCriticalPage,
		statisticsPage,
		damagePage,
	]);

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
					<PaginatedTable
						entries={customCriticalEntries}
						page={customCriticalPage}
						onPageChange={setCustomCriticalPage}
						rowsPerPage={ROWS_PER_PAGE}
						minWidth={620}
						head={
							<TableRow>
								<TableCell align="center">{t("common.name").toTitle()}</TableCell>
								<TableCell align="center">{t("calc.sign.title").toTitle()}</TableCell>
								<TableCell align="center">{t("modals.dice.value")}</TableCell>
								<TableCell align="center">{t("template.onNaturalDice")}</TableCell>
								<TableCell align="center">{t("template.affectSkill")}</TableCell>
							</TableRow>
						}
						renderRow={(name, crit) => (
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
						)}
					/>
				</Paper>
			)}

			{statisticsEntries.length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.statistics").toTitle()}
					</Typography>
					<PaginatedTable
						entries={statisticsEntries}
						page={statisticsPage}
						onPageChange={setStatisticsPage}
						rowsPerPage={ROWS_PER_PAGE}
						minWidth={700}
						head={
							<TableRow>
								<TableCell align="center">
									<strong>{t("common.name").toTitle()}</strong>
								</TableCell>
								<TableCell align="center">
									<strong>{t("graph.min.name").toTitle()}</strong>
								</TableCell>
								<TableCell align="center">
									<strong>{t("graph.max.name").toTitle()}</strong>
								</TableCell>
								<TableCell align="center">
									<strong>{t("template.formula")}</strong>
								</TableCell>
								<TableCell align="center">
									<strong>{t("register.embed.exclude")}</strong>
								</TableCell>
							</TableRow>
						}
						renderRow={(name, stat) => (
							<TableRow key={name}>
								<TableCell>
									<strong>{name}</strong>
								</TableCell>
								<TableCell align="center">
									<code>{stat.min ?? "—"}</code>
								</TableCell>
								<TableCell align="center">
									<code>{stat.max ?? "—"}</code>
								</TableCell>
								<TableCell align="center">
									<code style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
										{stat.combinaison ?? "—"}
									</code>
								</TableCell>
								<TableCell align="center">{stat.exclude ? <Check /> : <Close />}</TableCell>
							</TableRow>
						)}
					/>
				</Paper>
			)}

			{damageEntries.length > 0 && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
						{t("common.macro").toTitle()}
					</Typography>
					<PaginatedTable
						entries={damageEntries}
						page={damagePage}
						onPageChange={setDamagePage}
						rowsPerPage={ROWS_PER_PAGE}
						minWidth={420}
						head={
							<TableRow>
								<TableCell>{t("common.name").toTitle()}</TableCell>
								<TableCell>{t("template.formula")}</TableCell>
							</TableRow>
						}
						renderRow={(name, formula) => (
							<TableRow key={name}>
								<TableCell>
									<strong>{name}</strong>
								</TableCell>
								<TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
									<code>{formula || "—"}</code>
								</TableCell>
							</TableRow>
						)}
					/>
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
