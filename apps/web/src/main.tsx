import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/victor-mono/wght.css";
import "@fontsource-variable/karla/wght.css";
import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider, I18nProvider } from "./providers";
import "./styles.css";

const headingFont = { fontFamily: '"Karla Variable", "Inter", sans-serif' };

const theme = createTheme({
	cssVariables: {
		colorSchemeSelector: "data",
	},
	typography: {
		fontFamily: '"Atkinson Hyperlegible Next Variable", "Inter", sans-serif',
		h1: {
			headingFont,
		},
		h2: {
			headingFont,
		},
		h3: {
			headingFont,
		},
		h4: {
			headingFont,
		},
		h5: {
			headingFont,
		},
		h6: {
			headingFont,
		},
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
					fontFamily: '"Victor Mono Variable", monospace',
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
