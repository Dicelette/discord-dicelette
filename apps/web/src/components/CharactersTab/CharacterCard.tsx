import LockIcon from "@mui/icons-material/Lock";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useI18n } from "../../i18n";
import type { ApiCharacter } from "../../lib/api";
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
