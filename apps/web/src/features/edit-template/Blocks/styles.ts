/** Approximate row height on wide screens (xl+), matching Attributes/Snippets. */
export const ITEM_SIZE = 65;

/** Show ~5 rows then scroll, identical to user-config list behaviour. */
export const MAX_LIST_HEIGHT = 5 * ITEM_SIZE;

export const SCROLLABLE_TBODY_SX = {
	display: "block",
	width: "100%",
	"& > *:not(:last-child)": {
		borderBottom: "1px solid",
		borderColor: "divider",
	},
	// Bounded scroll area only on wide screens.
	// On narrow screens rows stack vertically and are too tall to cap.
	maxHeight: { xl: MAX_LIST_HEIGHT },
	overflowY: { xl: "auto" as const },
	scrollbarWidth: "thin" as const,
	scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
} as const;
