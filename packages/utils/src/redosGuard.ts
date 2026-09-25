import vm from "node:vm";

/** Strings shaped to trigger catastrophic backtracking, regardless of the pattern's actual target characters. */
const REDOS_PROBES = [
	`${"a".repeat(50)}!`,
	`${" ".repeat(50)}!`,
	`${"ab".repeat(30)}!`,
	`${"(".repeat(50)}!`,
	`${"0".repeat(50)}!`,
];

const REDOS_TIMEOUT_MS = 80;

/** Checks that a user-supplied regex can't freeze the event loop, via adversarial inputs run with a hard timeout. */
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
