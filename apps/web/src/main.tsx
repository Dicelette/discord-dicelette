import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { I18nProvider } from "./i18n";
import "./index.css";

const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#5865f2",
		},
		secondary: {
			main: "#57f287",
		},
		background: {
			default: "#1a1a2e",
			paper: "#16213e",
		},
	},
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
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<I18nProvider>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<BrowserRouter>
					<AuthProvider>
						<App />
					</AuthProvider>
				</BrowserRouter>
			</ThemeProvider>
		</I18nProvider>
	</React.StrictMode>
);
