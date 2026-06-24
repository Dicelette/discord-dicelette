import type { CustomCritical } from "@dicelette/core";

/**
 * Comparison signs accepted by a custom critical, in display order.
 * `satisfies` keeps the literal tuple type while pinning it to the core union,
 * so a typo (or a future change in core) is caught at compile time.
 */
export const SIGN_OPTIONS = [
	">",
	">=",
	"<",
	"<=",
	"==",
	"!=",
] as const satisfies readonly CustomCritical["sign"][];

/** A single comparison sign, derived from {@link SIGN_OPTIONS}. */
export type ComparisonSign = (typeof SIGN_OPTIONS)[number];
