import type { SxProps, Theme } from "@mui/material/styles";

export const SECTION_ROOT_SX = {
	display: "flex",
	flexDirection: "column",
	mb: 2,
} as const;

export const SECTION_TITLE_SX = {
	mb: 1,
	display: "flex",
	alignItems: "center",
	gap: 1,
	padding: 0,
	margin: 0,
} as const;

export const mergeSx = (
	base: SxProps<Theme>,
	override?: SxProps<Theme>
): SxProps<Theme> => {
	return Object.assign({}, base, override);
};

export const INLINE_BLOCK_SPAN_SX = { display: "inline-block" } as const;

export const ACTION_BUTTON_BASE_SX: SxProps<Theme> = {
	width: "100%",
	justifyContent: "flex-start",
};

export const MOBILE_ACTION_BUTTON_SX: SxProps<Theme> = [
	ACTION_BUTTON_BASE_SX,
	{ display: { xs: "flex", md: "none" } },
];

export const DESKTOP_ACTION_WRAPPER_SX = {
	display: { xs: "none", md: "inline-flex" },
} as const;

export const TRANSPARENT_ICON_BUTTON_SX: SxProps<Theme> = {
	p: 0,
	borderRadius: 0,
	bgcolor: "transparent",
	"&:hover": { bgcolor: "transparent", opacity: 0.8 },
};

export const MOBILE_TOGGLE_SX = {
	p: 1,
	width: "100%",
	justifyContent: "flex-start",
	gap: 1,
	display: { xs: "flex", md: "none" },
} as const;

const DESKTOP_TOGGLE_BASE_SX = {
	p: "3px",
	border: "none",
	borderRadius: 1,
	"&:hover": {
		opacity: 0.85,
	},
	"&.Mui-selected:hover": {
		opacity: 1,
	},
	display: { xs: "none", md: "inline-flex" },
} as const;

export const getDesktopToggleSx = (
	color: "info" | "warning" | "success" | "secondary" | "primary",
	selected: boolean
): SxProps<Theme> => ({
	...DESKTOP_TOGGLE_BASE_SX,
	color: selected ? "common.white" : `${color}.main`,
	bgcolor: selected ? `${color}.main` : "transparent",
	"&:hover": {
		bgcolor: `${color}.main`,
		color: "common.white",
		opacity: 0.85,
	},
	"&.Mui-selected:hover": {
		bgcolor: `${color}.dark`,
		opacity: 1,
	},
});

export const BASE_TEXTFIELD_SX = { width: { xs: "100%", xl: 400 }, mb: 2 } as const;

export const BASE_TABLEFIELD_SX = { width: { xs: "100%", xl: 200 }, mb: 0 } as const;
