import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { notices } from "./notices.mjs";
export default defineConfig({
	plugins: [notices()],
	root: fileURLToPath(new URL(".", import.meta.url)),
	build: {
		outDir: "../../../dist/opsweave-public",
		emptyOutDir: true,
		sourcemap: false,
		target: "es2022",
	},
	esbuild: { jsx: "automatic" },
});
