import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@dicelette/types": path.resolve(__dirname, "../../packages/types/index.ts"),
			"@dicelette/localization": path.resolve(__dirname, "../../packages/localization"),
			"@dicelette/dashboard-api": path.resolve(__dirname, "../../packages/dashboard-api"),
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
	build: {
		rolldownOptions: {
			output: {
				manualChunks: (id) => {
					if (
						id.includes("react-dom") ||
						id.includes("react-router") ||
						id.includes("/react/")
					)
						return "react";
					if (id.includes("@mui/") || id.includes("@emotion/")) return "mui";
					if (id.includes("@dicelette/core")) return "dicelette";
				},
			},
		},
	},
});
