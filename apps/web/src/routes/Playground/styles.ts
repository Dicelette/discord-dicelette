export const headerBoxSx = { px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } } as const;
export const toolbarBoxSx = {
	width: "100%",
	display: "flex",
	justifyContent: "flex-end",
	alignItems: "center",
	gap: 1,
	flexWrap: "wrap",
} as const;
export const mainBoxSx = { px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 6 } } as const;
export const stackSx = { maxWidth: 720, mx: "auto" } as const;
export const paperSx = { p: 3 } as const;
export const summarySx = { bgcolor: "action.hover" } as const;
export const summaryTitleSx = { fontWeight: 600 } as const;
export const logoBoxSx = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 1.5,
	mb: 1,
} as const;
export const boxBaseSx = {
	mt: 0.5,
	p: 2,
	borderRadius: 1,
	bgcolor: "var(--bg-default)",
	border: "1px solid",
	borderColor: "divider",
	minHeight: 48,
} as const;
