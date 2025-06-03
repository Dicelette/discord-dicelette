const fs = require("node:fs");
const path = require("node:path");

const pkgPath = path.resolve(__dirname, "..", "..", "package.json");
const raw = fs.readFileSync(pkgPath, "utf-8");
const pkg = JSON.parse(raw);

let changed = false;

if (pkg.pnpm?.overrides) {
	for (const dep in pkg.pnpm.overrides) {
		const value = pkg.pnpm.overrides[dep];
		if (typeof value === "string" && value.startsWith("link:")) {
			console.log(`🧹 Removing override for ${dep} (${value})`);
			delete pkg.pnpm.overrides[dep];
			changed = true;
		}
	}
	if (Object.keys(pkg.pnpm.overrides).length === 0) {
		delete pkg.pnpm.overrides;
	}
}

if (changed) {
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
	console.log("✅ package.json cleaned");
} else {
	console.log("👍 No local overrides found");
}
