import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const distDir = path.resolve("./dist");
//copy "packages/bot/package.json" to "dist/package.json"
const packageFile = path.resolve("./packages/bot/package.json");
const json = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
json.name = "@bot";
fs.writeFileSync(path.resolve(distDir, "package.json"), JSON.stringify(json, null, 2));

//rename the "@dicelette/bot" in packages to "@bot" (preventing crossed dependencies)

//pnpm i in dist
execSync("pnpm i");
