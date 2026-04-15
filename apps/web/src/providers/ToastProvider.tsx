import { Alert, Box } from "@mui/material";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

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
	const [toasts, setToasts] = useState<Toast[]>([]);
	const counter = useRef(0);

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
