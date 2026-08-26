import type { KarmaTone } from "./KarmaStatTile";

/** 2-column (Réussite | Échec) grid, single column on mobile. */
export const statsGridSx = {
	display: "grid",
	gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
	gap: 1.5,
} as const;

const COLUMN: Record<KarmaTone, number> = {
	success: 1,
	failure: 2,
	criticalSuccess: 1,
	criticalFailure: 2,
};
const ROW: Record<KarmaTone, number> = {
	success: 1,
	failure: 1,
	criticalSuccess: 2,
	criticalFailure: 2,
};

/** Positions a stat tile so success/failure share row 1 and their criticals share row 2. */
export function tilePositionSx(tone: KarmaTone) {
	return {
		gridColumn: { xs: "auto", sm: COLUMN[tone] },
		gridRow: { xs: "auto", sm: ROW[tone] },
	} as const;
}
