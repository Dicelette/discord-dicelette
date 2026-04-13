import { alpha } from "@mui/material/styles";

/** Approximate row height on wide screens (xl+), matching Attributes/Snippets. */
export const ITEM_SIZE = 65;

/** Show ~5 rows then scroll, identical to user-config list behaviour. */

export const TABLE_SX = { width: "100%" } as const;

export const ROW_SX = {
	display: "flex",
	flexDirection: { xs: "column", md: "row" },
	alignItems: { md: "center" },
	width: { md: "100%" },
} as const;

export const DUPLICATE_ROW_SX = {
	bgcolor: (theme: { palette: { error: { main: string } } }) =>
		alpha(theme.palette.error.main, 0.08),
} as const;

export const CELL_SX = { p: 1, width: { xs: "100%", md: "auto" } } as const;

export const BTN_CELL_SX = {
	p: { xs: 1, md: "2px" },
	width: { xs: "100%", md: "auto" },
} as const;

export const NUMBER_TABLE_FIELD_SX = { width: { xs: "100%", xl: 100 } } as const;

export const INLINE_BLOCK_SPAN_SX = { display: "inline-block" } as const;

export const SCROLLABLE_TBODY_SX = {
	display: "block",
	width: "100%",
	"& > *:not(:last-child)": {
		borderBottom: "1px solid",
		borderColor: "divider",
	},
	// Bounded scroll area only on wide screens.
	// On narrow screens rows stack vertically and are too tall to cap.
	overflowY: { xl: "auto" as const },
	scrollbarWidth: "thin" as const,
	scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
} as const;
