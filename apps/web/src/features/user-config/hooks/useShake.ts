import { useEffect, useState } from "react";

/**
 * Returns true for 400ms whenever `trigger` becomes truthy.
 * Used to drive shake animations on error display.
 */
export function useShake(trigger: unknown): boolean {
	const [shaking, setShaking] = useState(false);
	useEffect(() => {
		if (!trigger) return;
		setShaking(true);
		const t = setTimeout(() => setShaking(false), 400);
		return () => clearTimeout(t);
	}, [trigger]);
	return shaking;
}
