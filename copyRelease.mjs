import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const distDir = path.resolve("./dist");
//copy "packages/bot/package.json" to "dist/package.json"
fs.copyFileSync(
	path.resolve("./packages/bot/package.json"),
	path.resolve(distDir, "package.json")
);
//pnpm i in dist
execSync("pnpm i .", { cwd: distDir, stdio: "inherit" });
