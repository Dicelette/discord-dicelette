import type { ApiCharacter } from "@dicelette/api";
import { Lock, OpenInNew } from "@mui/icons-material";
import { Avatar, Box, Button, Chip, Divider, Paper, Typography } from "@mui/material";
import "uniformize";
import { useI18n } from "@shared";
import { memo } from "react";
import StatCell from "./StatCell";

const cardPaperSx = { p: 3 } as const;
const headerBoxSx = { display: "flex", alignItems: "center", gap: 2, mb: 2 } as const;
const avatarSx = { width: 56, height: 56 } as const;
const nameSectionSx = { flex: 1, minWidth: 0 } as const;
const nameRowSx = { display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" } as const;
const dividerSx = { mb: 1.5 } as const;
const dividerWithStatsSx = { mb: 1.5, mt: 1.5 } as const;
const statsGridSx = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
	gap: 1,
	mb: 1,
} as const;
const damageGridSx = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
	gap: 1,
} as const;

interface Props {
	char: ApiCharacter;
}

function CharacterCard({ char }: Props) {
	const { t } = useI18n();
	const displayName = char.charName ?? t("characters.unnamed");

	return (
		<Paper variant="outlined" sx={cardPaperSx}>
			<Box sx={headerBoxSx}>
				<Avatar
					src={char.avatar ?? undefined}
					alt={displayName.toTitle()}
					sx={avatarSx}
				>
					{displayName.charAt(0).toUpperCase()}
				</Avatar>

				<Box sx={nameSectionSx}>
					<Box sx={nameRowSx}>
						<Typography variant="h4" fontWeight={600} noWrap>
							{displayName.toTitle()}
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
					<Divider sx={dividerSx} />
					<Typography variant="h6" color="text.secondary" gutterBottom>
						{t("common.statistics").toTitle()}
					</Typography>
					<Box sx={statsGridSx}>
						{char.stats.map((field) => (
							<StatCell key={field.name} name={field.name} value={field.value} />
						))}
					</Box>
				</>
			)}

			{char.damage && char.damage.length > 0 && (
				<>
					<Divider sx={char.stats ? dividerWithStatsSx : dividerSx} />
					<Typography variant="h6" color="text.secondary" gutterBottom>
						{t("common.macro").toTitle()}
					</Typography>
					<Box sx={damageGridSx}>
						{char.damage.map((field) => (
							<StatCell key={field.name} name={field.name} value={field.value} />
						))}
					</Box>
				</>
			)}
		</Paper>
	);
}

export default memo(CharacterCard);
