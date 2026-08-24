import { Button, Stack, Typography } from "@mui/material";
import { Component, type ReactNode } from "react";
import { useI18n } from "../i18n";

function ErrorFallback() {
	const { t } = useI18n();
	return (
		<Stack
			sx={{
				minHeight: "100vh",
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				px: 3,
				gap: 2,
			}}
		>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				{t("common.unexpectedError")}
			</Typography>
			<Typography sx={{ color: "text.secondary", maxWidth: 480 }}>
				{t("common.unexpectedErrorHint")}
			</Typography>
			<Button variant="contained" onClick={() => window.location.reload()}>
				{t("common.reload")}
			</Button>
		</Stack>
	);
}

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

/** Catches otherwise-uncaught render errors so a single crash doesn't blank the whole SPA. */
export default class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: unknown, info: unknown) {
		console.error("Unhandled render error:", error, info);
	}

	render() {
		if (this.state.hasError) return <ErrorFallback />;
		return this.props.children;
	}
}
