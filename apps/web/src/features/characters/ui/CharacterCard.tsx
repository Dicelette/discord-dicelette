import { Lock, OpenInNew } from "@mui/icons-material";
import { Avatar, Box, Button, Chip, Divider, Paper, Typography } from "@mui/material";
import { type ApiCharacter, useI18n } from "../../../shared";
import "uniformize";
import StatCell from "./StatCell";

interface Props {
	char: ApiCharacter;
}

export default function CharacterCard({ char }: Props) {
	const { t } = useI18n();
	const displayName = char.charName ?? t("characters.unnamed");

	return (
		<Paper variant="outlined" sx={{ p: 3 }}>
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
						<Typography variant="h4" fontWeight={600} noWrap>
							{displayName}
						</Typography>
						{char.isPrivate && (
							<Chip
								icon={<Lock />}
								label={t("common.isPrivate")}
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
						endIcon={<OpenInNew />}
						href={char.discordLink}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("characters.sheetLink")}
					</Button>
				)}
			</Box>

			{char.stats && char.stats.length > 0 && (
				<>
					<Divider sx={{ mb: 1.5 }} />
					<Typography variant="h6" color="text.secondary" gutterBottom>
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

			{char.damage && char.damage.length > 0 && (
				<>
					<Divider sx={{ mb: 1.5, mt: char.stats ? 1.5 : 0 }} />
					<Typography variant="h6" color="text.secondary" gutterBottom>
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
