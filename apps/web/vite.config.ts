import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@dicelette/types": path.resolve(__dirname, "../../packages/types/index.ts"),
			"@dicelette/localization": path.resolve(__dirname, "../../packages/localization"),
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
				manualChunks: {
					react: ["react", "react-dom", "react-router-dom"],
					mui: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
					dicelette: ["@dicelette/core"],
				},
			},
		},
	},
});
