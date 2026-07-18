import vm from "node:vm";

/**
 * Strings shaped to trigger catastrophic backtracking (nested/ambiguous quantifiers)
 * regardless of which characters the untrusted pattern actually targets.
 */
const REDOS_PROBES = [
	`${"a".repeat(50)}!`,
	`${" ".repeat(50)}!`,
	`${"ab".repeat(30)}!`,
	`${"(".repeat(50)}!`,
	`${"0".repeat(50)}!`,
];

const REDOS_TIMEOUT_MS = 80;

/**
 * Checks that a user-supplied regex pattern can't be used to freeze the event loop.
 * Runs the pattern against several adversarial inputs inside a `vm` context with a
 * hard timeout: a real V8 execution budget catches catastrophic backtracking that
 * static "does it contain (x+)+" checks would miss or false-positive on.
 */
export function isRegexSafe(pattern: string, flags = ""): boolean {
	try {
		new RegExp(pattern, flags);
	} catch {
		return false;
	}
	for (const input of REDOS_PROBES) {
		try {
			vm.runInNewContext(
				"new RegExp(pattern, flags).test(input)",
				{ flags, input, pattern },
				{ timeout: REDOS_TIMEOUT_MS }
			);
		} catch {
			return false;
		}
	}
	return true;
}
