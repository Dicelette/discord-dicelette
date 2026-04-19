import type { ApiCharacter } from "@dicelette/api";
import { Lock, OpenInNew } from "@mui/icons-material";
import { Avatar, Box, Chip, Divider, Link, Paper, Typography } from "@mui/material";
import "uniformize";
import { purple } from "@mui/material/colors";
import { useI18n } from "@shared";
import { memo } from "react";
import StatCell from "./StatCell";

const cardPaperSx = { p: 3 } as const;
const headerBoxSx = { display: "flex", alignItems: "center", gap: 2, mb: 2 } as const;
const avatarSx = { width: 56, height: 56 } as const;
const nameSectionSx = { flex: 1, minWidth: 0 } as const;
const nameRowSx = {
	display: "flex",
	alignItems: "center",
	gap: 1,
	flexWrap: "wrap",
} as const;
const nameLinkSx = {
	display: "inline-flex",
	alignItems: "center",
	gap: 0.75,
	maxWidth: "100%",
	color: purple[200],
	textDecoration: "none",
	transition: "color 120ms ease, text-decoration-color 120ms ease",
	"&:hover": {
		color: purple[400],
		textDecoration: "underline",
		textDecorationThickness: "0.08em",
		textUnderlineOffset: "0.12em",
	},
	"&:focus-visible": {
		outline: "2px solid",
		outlineColor: purple[200],
		outlineOffset: 2,
		borderRadius: 4,
	},
} as const;
const nameTypographySx = { minWidth: 0, color: "inherit" } as const;
const externalIconSx = { fontSize: 16, opacity: 0.8, flexShrink: 0 } as const;
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
	const displayName = char.charName ?? t("common.default");

	return (
		<Paper variant="outlined" sx={cardPaperSx}>
			<Box sx={headerBoxSx}>
				<Avatar src={char.avatar ?? undefined} alt={displayName.toTitle()} sx={avatarSx}>
					{displayName.charAt(0).toUpperCase()}
				</Avatar>

				<Box sx={nameSectionSx}>
					<Box sx={nameRowSx}>
						{char.canLink ? (
							<Link
								href={char.discordLink}
								target="_blank"
								rel="noopener noreferrer"
								sx={nameLinkSx}
							>
								<Typography variant="h4" fontWeight={600} noWrap sx={nameTypographySx}>
									{displayName.toTitle()}
								</Typography>
								<OpenInNew sx={externalIconSx} />
							</Link>
						) : (
							<Typography variant="h4" fontWeight={600} noWrap sx={nameTypographySx}>
								{displayName.toTitle()}
							</Typography>
						)}
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
