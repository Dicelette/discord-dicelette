import "@fontsource/atkinson-hyperlegible-next";
import "@fontsource/iosevka-charon";
import "@fontsource-variable/victor-mono";
import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider, I18nProvider } from "./providers";
import "./styles.css";

const theme = createTheme({
	typography: {
		fontFamily: '"Atkinson Hyperlegible Next", "Inter", sans-serif',
	},
	components: {
		MuiAccordion: {
			styleOverrides: {
				root: ({ theme }) => ({
					"&&": { borderRadius: theme.shape.borderRadius },
					"&::before": { display: "none" },
				}),
			},
		},
		MuiInputBase: {
			styleOverrides: {
				input: {
					fontFamily: '"Victor Mono", monospace',
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				sizeSmall: ({ theme }) => ({
					height: 28,
					fontSize: theme.typography.pxToRem(14),
				}),
				labelSmall: {
					paddingInline: 11,
				},
				iconSmall: {
					fontSize: 19,
				},
				deleteIconSmall: {
					fontSize: 19,
				},
			},
		},
	},
	colorSchemes: {
		dark: {
			palette: {
				primary: { main: "#D46BD4" },
				secondary: { main: "#e1c0f5" },
				background: {
					default: "var(--bg-default)",
					paper: "var(--bg-paper)",
				},
				text: {
					primary: "rgba(255, 255, 255, 0.87)",
					secondary: "rgba(255, 255, 255, 0.6)",
				},
			},
		},
		light: {
			palette: {
				primary: { main: "#960ea5" },
				secondary: { main: "#d500f9" },
			},
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<I18nProvider>
			<ThemeProvider theme={theme}>
				<CssBaseline enableColorScheme />
				<BrowserRouter>
					<AuthProvider>
						<App />
					</AuthProvider>
				</BrowserRouter>
			</ThemeProvider>
		</I18nProvider>
	</React.StrictMode>
);
