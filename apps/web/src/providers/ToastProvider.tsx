import { RATE_LIMIT_EVENT, type RateLimitEventDetail } from "@dicelette/api";
import { Alert, Box } from "@mui/material";
import { useI18n } from "@shared";
import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

/** Minimum gap between rate-limit toasts — a 429 burst fires many rejected
 * requests at once, and only one "slow down" message is useful. */
const RATE_LIMIT_TOAST_COOLDOWN_MS = 5000;

type Severity = "success" | "error" | "warning" | "info";

interface Toast {
	id: number;
	message: string;
	severity: Severity;
}

interface ToastContextValue {
	enqueueToast: (message: string, severity?: Severity) => void;
}

const ToastContext = createContext<ToastContextValue>({ enqueueToast: () => {} });

export function useToast() {
	return useContext(ToastContext);
}

const TOAST_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
	const { t } = useI18n();
	const [toasts, setToasts] = useState<Toast[]>([]);
	const counter = useRef(0);
	const lastRateLimitToastAt = useRef(0);

	const dismiss = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const enqueueToast = useCallback(
		(message: string, severity: Severity = "success") => {
			const id = ++counter.current;
			setToasts((prev) => [...prev, { id, message, severity }]);
			setTimeout(() => dismiss(id), TOAST_DURATION);
		},
		[dismiss]
	);

	useEffect(() => {
		const handleRateLimited = (e: Event) => {
			const now = Date.now();
			if (now - lastRateLimitToastAt.current < RATE_LIMIT_TOAST_COOLDOWN_MS) return;
			lastRateLimitToastAt.current = now;
			const { retryAfter } = (e as CustomEvent<RateLimitEventDetail>).detail;
			enqueueToast(
				retryAfter
					? t("common.rateLimited", { seconds: retryAfter })
					: t("common.rateLimitedGeneric"),
				"warning"
			);
		};
		window.addEventListener(RATE_LIMIT_EVENT, handleRateLimited);
		return () => window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimited);
	}, [t, enqueueToast]);

	return (
		<ToastContext.Provider value={{ enqueueToast }}>
			{children}
			<Box
				sx={{
					position: "fixed",
					top: 24,
					right: 24,
					zIndex: 1400,
					display: "flex",
					flexDirection: "column",
					gap: 1,
					width: 360,
				}}
			>
				{toasts.map((toast) => (
					<Alert
						key={toast.id}
						severity={toast.severity}
						variant="filled"
						onClose={() => dismiss(toast.id)}
					>
						{toast.message}
					</Alert>
				))}
			</Box>
		</ToastContext.Provider>
	);
}
