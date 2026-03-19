import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	root: new URL(".", import.meta.url).pathname,
	plugins: [react()],
	server: {
		port: 4173,
		host: "0.0.0.0",
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
});
