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
			<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" },
					gridTemplateAreas: showSearch
						? { xs: '"title" "search"', sm: '"title search"' }
						: { xs: '"title"', sm: '"title ."' },
					alignItems: "center",
					gap: 2,
					mb: 3,
				}}
			>
				<Typography
					variant="h5"
					fontWeight={600}
					sx={{ whiteSpace: "nowrap", gridArea: "title" }}
				>
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
						sx={{
							gridArea: "search",
							width: { xs: "100%", sm: 320 },
							justifySelf: { xs: "stretch", sm: "end" },
						}}
					/>
				)}
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={onCloseError}>
					{error}
				</Alert>
			)}

			{pageChars.length === 0 ? (
				<Typography color="text.secondary">{emptyText}</Typography>
			) : (
				<>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{pageChars.map((char) => renderCard(char))}
					</Box>

					{totalPages > 1 && (
						<Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
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
