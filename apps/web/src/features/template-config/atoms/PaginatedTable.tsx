import {
	Box,
	Pagination,
	Table,
	TableBody,
	TableContainer,
	TableHead,
} from "@mui/material";
import type { ReactNode } from "react";

const TABLE_HEAD_SX = {
	"& .MuiTableCell-root": {
		backgroundColor: "action.selected",
		fontWeight: 700,
	},
} as const;

const tableContainerSx = { overflowX: "auto" } as const;
const paginationBoxSx = { display: "flex", justifyContent: "flex-end", mt: 1 } as const;

interface Props<T> {
	entries: [string, T][];
	page: number;
	onPageChange: (page: number) => void;
	rowsPerPage: number;
	minWidth: number;
	head: ReactNode;
	renderRow: (key: string, value: T) => ReactNode;
}

export default function PaginatedTable<T>({
	entries,
	page,
	onPageChange,
	rowsPerPage,
	minWidth,
	head,
	renderRow,
}: Props<T>) {
	const pageEntries = entries.slice((page - 1) * rowsPerPage, page * rowsPerPage);

	return (
		<>
			<TableContainer sx={tableContainerSx}>
				<Table size="small" sx={{ minWidth }}>
					<TableHead sx={TABLE_HEAD_SX}>{head}</TableHead>
					<TableBody>
						{pageEntries.map(([key, value]) => renderRow(key, value))}
					</TableBody>
				</Table>
			</TableContainer>
			{entries.length > rowsPerPage && (
				<Box sx={paginationBoxSx}>
					<Pagination
						count={Math.ceil(entries.length / rowsPerPage)}
						page={page}
						onChange={(_, p) => onPageChange(p)}
						size="small"
					/>
				</Box>
			)}
		</>
	);
}
