import LockIcon from "@mui/icons-material/Lock";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n";
import type { ApiCharacter } from "../lib/api";
import { charactersApi } from "../lib/api";
import "uniformize";

interface Props {
	guildId: string;
}

export default function CharactersTab({ guildId }: Props) {
	const { t } = useI18n();
	const [characters, setCharacters] = useState<ApiCharacter[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(
		async (forceRefresh = false) => {
			setError(null);
			if (forceRefresh) {
				setRefreshing(true);
				try {
					await charactersApi.refresh(guildId);
				} catch {
					// ignore
				}
			}
			try {
				const res = await charactersApi.getCharacters(guildId);
				setCharacters(res.data);
			} catch {
				setError(t("characters.loadError"));
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[guildId, t]
	);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: 3,
				}}
			>
				<Typography variant="h6" fontWeight={600}>
					{t("characters.title")}
				</Typography>
				<Tooltip title={t("characters.refreshTooltip")}>
					<span>
						<IconButton onClick={() => load(true)} disabled={refreshing} size="small">
							<RefreshIcon
								sx={{
									transition: "transform 0.4s",
									transform: refreshing ? "rotate(360deg)" : "none",
								}}
							/>
						</IconButton>
					</span>
				</Tooltip>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{characters.length === 0 ? (
				<Typography color="text.secondary">{t("characters.noCharacters")}</Typography>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{characters.map((char) => (
						<CharacterCard key={`${char.channelId}-${char.messageId}`} char={char} />
					))}
				</Box>
			)}
		</Box>
	);
}

function CharacterCard({ char }: { char: ApiCharacter }) {
	const { t } = useI18n();
	const displayName = char.charName ?? t("characters.unnamed");

	return (
		<Paper variant="outlined" sx={{ p: 3 }}>
			{/* Header: avatar + name + badges + link */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
				<Avatar
					src={char.avatar ?? undefined}
					alt={displayName}
					sx={{ width: 56, height: 56 }}
				>
					{displayName.charAt(0).toUpperCase()}
				</Avatar>

				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
						<Typography variant="h6" fontWeight={600} noWrap>
							{displayName}
						</Typography>
						{char.isPrivate && (
							<Chip
								icon={<LockIcon />}
								label={t("characters.private")}
								size="small"
								color="default"
							/>
						)}
					</Box>
				</Box>

				{char.canLink && (
					<Button
						variant="outlined"
						size="small"
						endIcon={<OpenInNewIcon />}
						href={char.discordLink}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("characters.sheetLink")}
					</Button>
				)}
			</Box>

			{/* Stats */}
			{char.stats && char.stats.length > 0 && (
				<>
					<Divider sx={{ mb: 1.5 }} />
					<Typography variant="subtitle2" color="text.secondary" gutterBottom>
						{t("common.statistics").toTitle()}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
							gap: 1,
							mb: 1,
						}}
					>
						{char.stats.map((field) => (
							<StatCell key={field.name} name={field.name} value={field.value} />
						))}
					</Box>
				</>
			)}

			{/* Damage / skill dice */}
			{char.damage && char.damage.length > 0 && (
				<>
					<Divider sx={{ mb: 1.5, mt: char.stats ? 1.5 : 0 }} />
					<Typography variant="subtitle2" color="text.secondary" gutterBottom>
						{t("common.macro").toTitle()}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
							gap: 1,
						}}
					>
						{char.damage.map((field) => (
							<StatCell key={field.name} name={field.name} value={field.value} />
						))}
					</Box>
				</>
			)}
		</Paper>
	);
}

function StatCell({ name, value }: { name: string; value: string }) {
	// Strip markdown backticks from value (discord embed format)
	const clean = value.replace(/^`+|`+$/g, "").trim();
	return (
		<Box
			sx={{
				bgcolor: "action.hover",
				borderRadius: 1,
				px: 1.5,
				py: 0.75,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Typography variant="caption" color="text.secondary" noWrap>
				{name}
			</Typography>
			<Typography variant="body2" fontWeight={600} noWrap>
				{clean}
			</Typography>
		</Box>
	);
}
