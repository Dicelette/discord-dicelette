import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const sourcePath = path.resolve(dirname, "package.json");
const targets = [
	path.resolve(dirname, "packages/bot/package.json"),
	path.resolve(dirname, "packages/utils/package.json"),
];

try {
	const sourceJson = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
	const version = sourceJson.version;

	for (const targetPath of targets) {
		const targetJson = JSON.parse(fs.readFileSync(targetPath, "utf8"));
		targetJson.version = version;
		fs.writeFileSync(targetPath, `${JSON.stringify(targetJson, null, 2)}\n`, "utf8");
		console.info(
			`Version mise à jour : ${path.relative(dirname, targetPath)} -> ${version}`
		);
	}
} catch (err) {
	console.error("Erreur lors de la synchronisation des versions :", err.message || err);
	process.exitCode = 1;
}
