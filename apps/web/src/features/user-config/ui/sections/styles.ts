import { SHAKE_KEYFRAMES } from "../atoms";

export const ITEM_SIZE = 65;
export const MAX_LIST_HEIGHT = 5 * ITEM_SIZE;

export const accordionSummarySx = { bgcolor: "action.hover" } as const;
export const listBoxSx = { mb: 2 } as const;
export const emptyTextSx = { fontStyle: "italic" } as const;
export const addRowBoxSx = { display: "flex", gap: 1, mb: 1 } as const;
export const alertMbSx = { mb: 1 } as const;
export const alertShakeSx = {
	mb: 1,
	...SHAKE_KEYFRAMES,
	animation: "shake 0.4s ease",
} as const;
export const actionsBoxSx = { display: "flex", gap: 1, flexWrap: "wrap" } as const;
export const descriptionSx = { mb: 2 } as const;
export const inputHiddenStyle = { display: "none" } as const;
export const codeInputSlotProps = {
	htmlInput: { style: { fontFamily: "var(--code-font-family)" } },
} as const;
