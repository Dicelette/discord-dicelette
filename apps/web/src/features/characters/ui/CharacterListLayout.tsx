import type { ApiCharacter } from "@dicelette/api";
import SearchIcon from "@mui/icons-material/Search";
import {
	Alert,
	Box,
	CircularProgress,
	InputAdornment,
	Pagination,
	TextField,
	Typography,
} from "@mui/material";
import type { ReactNode } from "react";

const loadingBoxSx = { display: "flex", justifyContent: "center", p: 6 } as const;
const headerGridWithSearchSx = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
	gridTemplateAreas: { xs: '"title" "search"', sm: '"title search"' },
	alignItems: "center",
	gap: 2,
	mb: 3,
} as const;
const headerGridNoSearchSx = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
	gridTemplateAreas: { xs: '"title"', sm: '"title ."' },
	alignItems: "center",
	gap: 2,
	mb: 3,
} as const;
const titleTypographySx = { whiteSpace: "nowrap", gridArea: "title" } as const;
const searchFieldSx = {
	gridArea: "search",
	width: { xs: "100%", sm: 320 },
	justifySelf: { xs: "stretch", sm: "end" },
} as const;
const alertSx = { mb: 2 } as const;
const listBoxSx = { display: "flex", flexDirection: "column", gap: 3 } as const;
const paginationBoxSx = { display: "flex", justifyContent: "center", mt: 3 } as const;

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
}

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
