import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@dicelette/types": path.resolve(__dirname, "../../packages/types/index.ts"),
			"@dicelette/localization": path.resolve(__dirname, "../../packages/localization"),
			"@dicelette/api": path.resolve(__dirname, "../../dashboard/api"),
			"@shared": path.resolve(__dirname, "./src/shared/index.ts"),
		},
	},
	optimizeDeps: {
		exclude: ["**/playwright-report/**"],
	},
	server: {
		watch: {
			ignored: [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/playwright-report/**",
			],
		},
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
				xfwd: true, // transmet X-Forwarded-Host → permet de rediriger vers l'IP réelle
			},
		},
	},
	build: {
		chunkSizeWarningLimit: 10000,
		reportCompressedSize: false,
		minify: "oxc",
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
					if (id.includes("@hello-pangea/dnd")) return "dnd";
					if (id.includes("@dicelette/core")) return "dicelette";
				},
			},
		},
	},
});
