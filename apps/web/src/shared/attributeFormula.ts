import { escapeRegex, findBestStatMatch, isNumber } from "@dicelette/core";
import { evaluate } from "mathjs";

/**
 * Substitute variable tokens in a standardized expression using fuzzy/prefix
 * matching — same behaviour as the bot's `replaceStatsInDiceFormula`.
 */
function substituteTokens(expr: string, resolvedStats: Map<string, number>): string {
	return expr.replace(/([\p{L}\p{M}._-]+)*/gu, (token) => {
		const match = findBestStatMatch<number>(token, resolvedStats);
		return match !== undefined ? match.toString() : token;
	});
}

export type FormulaHintResult =
	| { kind: "resolved"; value: number }
	| { kind: "error" }
	| { kind: "not-formula" };

/**
 * Given a formula string and the full attribute map, resolve the formula to a
 * number using incremental substitution of known values.
 *
 * Returns:
 *   - `{ kind: "resolved", value }` — formula evaluated successfully
 *   - `{ kind: "error" }`           — formula references unknown attributes or is invalid
 *   - `{ kind: "not-formula" }`     — value is already a plain number (no hint needed)
 */
export function resolveFormulaHint(
	formula: string,
	allAttributes: Record<string, number | string>
): FormulaHintResult {
	const trimmed = formula.trim();
	if (!trimmed) return { kind: "not-formula" };

	// Plain numbers need no formula hint
	if (!Number.isNaN(Number(trimmed))) return { kind: "not-formula" };

	// Separate numeric attrs from formula attrs
	const resolved = new Map<string, number>();
	const pending = new Map<string, string>();

	for (const [name, val] of Object.entries(allAttributes)) {
		const norm = name.standardize();
		if (typeof val === "number") {
			resolved.set(norm, val);
		} else {
			const t = val.trim();
			if (t && !isNumber(t)) {
				pending.set(norm, t.standardize());
			} else if (t) {
				// String that is actually a number
				resolved.set(norm, Number(t));
			}
		}
	}

	// Pre-substitute already-resolved numbers into all pending expressions using fuzzy matching
	for (const [normName, expr] of pending) {
		pending.set(normName, substituteTokens(expr, resolved));
	}

	// Iteratively resolve pending formulas
	let progress = true;
	while (pending.size > 0 && progress) {
		progress = false;
		for (const [normName, expr] of pending) {
			try {
				const result = evaluate(expr);
				if (!isNumber(result)) continue;
				resolved.set(normName, result);
				pending.delete(normName);
				progress = true;
				const re = new RegExp(escapeRegex(normName), "gi");
				for (const [otherNorm, otherExpr] of pending) {
					pending.set(otherNorm, otherExpr.replace(re, result.toString()));
				}
			} catch {
				// Not yet resolvable — try again next round
			}
		}
	}

	// Now try to evaluate the target formula using fuzzy matching
	const normFormula = trimmed.standardize();
	const expr = substituteTokens(normFormula, resolved);

	try {
		const result = evaluate(expr);
		if (isNumber(result)) {
			return { kind: "resolved", value: result };
		}
		return { kind: "error" };
	} catch {
		return { kind: "error" };
	}
}
