import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

const workspacePath = path.resolve("pnpm-workspace.yaml");
const raw = fs.readFileSync(workspacePath, "utf-8");
const workspace = parse(raw);

let changed = false;

if (workspace.overrides) {
	for (const dep in workspace.overrides) {
		const value = workspace.overrides[dep];
		if (typeof value === "string" && value.startsWith("link:")) {
			console.log(`🧹 Removing override for ${dep} (${value})`);
			delete workspace.overrides[dep];
			changed = true;
		}
	}
	if (Object.keys(workspace.overrides).length === 0) delete workspace.overrides;
}

if (changed) {
	fs.writeFileSync(workspacePath, stringify(workspace));
	console.log("✅ pnpm-workspace.yaml cleaned");
} else 
	console.log("👍 No local overrides found");

