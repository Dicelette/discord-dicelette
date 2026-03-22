import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { I18nProvider } from "./i18n/provider";
import "./index.css";

const theme = createTheme({
	typography: {
		fontFamily: '"Atkinson Hyperlegible Next", "Inter", sans-serif',
	},
	components: {
		// biome-ignore lint/style/useNamingConvention: MUI requires PascalCase component keys
		MuiInputBase: {
			styleOverrides: {
				input: {
					fontFamily: '"Iosevka Charon", monospace',
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
