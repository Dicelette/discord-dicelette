import type { ApiCharacter } from "@dicelette/api";
import SearchIcon from "@mui/icons-material/Search";
import {
	Alert,
	Box,
	CircularProgress,
	InputAdornment,
	Pagination,
	type SxProps,
	TextField,
	type Theme,
	Typography,
} from "@mui/material";
import type { ReactNode } from "react";

const loadingBoxSx: SxProps<Theme> = {
	display: "flex",
	justifyContent: "center",
	p: 6,
} as const;
const headerGridWithSearchSx: SxProps<Theme> = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
	gridTemplateAreas: { xs: '"title" "search"', sm: '"title search"' },
	alignItems: "center",
	gap: 2,
	mb: 3,
} as const;
const headerGridNoSearchSx: SxProps<Theme> = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
	gridTemplateAreas: { xs: '"title"', sm: '"title ."' },
	alignItems: "center",
	gap: 2,
	mb: 3,
} as const;
const titleTypographySx: SxProps<Theme> = {
	whiteSpace: "nowrap",
	gridArea: "title",
} as const;
const searchFieldSx: SxProps<Theme> = {
	gridArea: "search",
	width: { xs: "100%", sm: 320 },
	justifySelf: { xs: "stretch", sm: "end" },
} as const;
const alertSx: SxProps<Theme> = { mb: 2 } as const;
const listBoxSx: SxProps<Theme> = {
	display: "flex",
	flexDirection: "column",
	gap: 3,
} as const;
const paginationBoxSx: SxProps<Theme> = {
	display: "flex",
	justifyContent: "center",
	mt: 3,
} as const;

interface Props {
	title: string;
	searchPlaceholder: string;
	showSearch: boolean;
	loading: boolean;
	error: string | null;
	onCloseError: () => void;
	search: string;
	onSearchChange: (value: string) => void;
	page: number;
	onPageChange: (page: number) => void;
	pageChars: ApiCharacter[];
	totalPages: number;
	emptyText: string;
	renderCard: (char: ApiCharacter) => ReactNode;
	actions?: ReactNode;
}

const actionSx: SxProps<Theme> = {
	mb: 2,
	display: "flex",
	gap: 1,
	justifyContent: "space-evenly",
	flexDirection: { xs: "column", sm: "row" },
} as const;

export default function CharacterListLayout({
	title,
	searchPlaceholder,
	showSearch,
	loading,
	error,
	onCloseError,
	search,
	onSearchChange,
	page,
	onPageChange,
	pageChars,
	totalPages,
	emptyText,
	renderCard,
	actions,
}: Props) {
	if (loading) {
		return (
			<Box sx={loadingBoxSx}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			<Box sx={showSearch ? headerGridWithSearchSx : headerGridNoSearchSx}>
				<Typography variant="h5" fontWeight={600} sx={titleTypographySx}>
					{title}
				</Typography>

				{showSearch && (
					<TextField
						size="small"
						placeholder={searchPlaceholder}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon fontSize="small" />
									</InputAdornment>
								),
							},
						}}
						sx={searchFieldSx}
					/>
				)}
			</Box>

			{actions && <Box sx={actionSx}>{actions}</Box>}

			{error && (
				<Alert severity="error" sx={alertSx} onClose={onCloseError}>
					{error}
				</Alert>
			)}

			{pageChars.length === 0 ? (
				<Typography color="text.secondary">{emptyText}</Typography>
			) : (
				<>
					<Box sx={listBoxSx}>{pageChars.map((char) => renderCard(char))}</Box>

					{totalPages > 1 && (
						<Box sx={paginationBoxSx}>
							<Pagination
								count={totalPages}
								page={page}
								onChange={(_e, value) => onPageChange(value)}
								color="primary"
								shape="rounded"
							/>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
