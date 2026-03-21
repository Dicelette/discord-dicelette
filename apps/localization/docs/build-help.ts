import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

type Target = Record<string, string>;

//@ts-expect-error: tsx allow this natively
const SOURCE_PATH = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const BUILD_MODE = args.includes("--build");

const LANGUAGES = ["en", "fr"];

const PATH_TO_REPLACE: Target = {
	"help.admin.messageDB": "message_db",
	"help.admin.messageNoDB": "message_no_db",
	"help.bug.message": "bug_report",
	"help.diceNotation": "dice_notation",
	"help.fr.message": "feature_request",
	"help.message": "message",
	"help.messageDB": "cmd_db",
	"help.register.message": "register",
};

/**
 * Remonte depuis `dir` jusqu'à trouver un répertoire contenant `marker`.
 * Lance une erreur si la racine du système de fichiers est atteinte sans succès.
 */
function findRoot(dir: string, marker: string): string {
	let current = dir;
	while (true) {
		if (fs.existsSync(path.join(current, marker))) return current;
		const parent = path.dirname(current);
		if (parent === current) throw new Error(`Could not find ${marker} from ${dir}`);
		current = parent;
	}
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic object structure
function getNestedKey(obj: any, keyPath: string): string | undefined {
	return keyPath.split(".").reduce((cur, k) => cur?.[k], obj);
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic object structure
function setNestedKey(obj: any, keyPath: string, value: string) {
	const keys = keyPath.split(".");
	let current = obj;
	while (keys.length > 1) {
		const key = keys.shift()!;
		if (!(key in current)) current[key] = {};
		current = current[key];
	}
	current[keys[0]] = value;
}

function getLocalesPath(): string {
	if (BUILD_MODE) {
		const root = findRoot(SOURCE_PATH, "pnpm-workspace.yaml");
		return path.join(root, "dist/apps/localization/locales");
	}
	return path.resolve(SOURCE_PATH, "../locales");
}

/**
 * Compare les valeurs des clés dans le JSON existant avec le contenu des .md.
 * Retourne true si au moins une clé diffère.
 */
// biome-ignore lint/suspicious/noExplicitAny: dynamic object structure
function hasChanges(lang: string, existingContent: any): boolean {
	for (const [key, value] of Object.entries(PATH_TO_REPLACE)) {
		const filePath = path.join(SOURCE_PATH, lang, `${value}.md`);
		if (!fs.existsSync(filePath)) continue;
		const mdContent = fs.readFileSync(filePath, "utf-8");
		if (getNestedKey(existingContent, key) !== mdContent) return true;
	}
	return false;
}

function replaceInLocales(localesPath: string): boolean {
	let anyUpdated = false;
	for (const lang of LANGUAGES) {
		const outputPath = path.join(localesPath, `${lang}.json`);
		if (!fs.existsSync(outputPath)) {
			console.warn(`File not found: ${outputPath}`);
			continue;
		}
		const existingContent = JSON.parse(fs.readFileSync(outputPath, "utf-8"));

		if (!hasChanges(lang, existingContent)) {
			console.log(`${lang}.json is already up-to-date, skipping.`);
			continue;
		}

		for (const [key, value] of Object.entries(PATH_TO_REPLACE)) {
			const filePath = path.join(SOURCE_PATH, lang, `${value}.md`);
			if (fs.existsSync(filePath))
				setNestedKey(existingContent, key, fs.readFileSync(filePath, "utf-8"));
			else console.warn(`File not found: ${filePath}`);
		}
		fs.writeFileSync(outputPath, JSON.stringify(existingContent, null, 2));
		console.log(`Updated ${outputPath}`);
		anyUpdated = true;
	}
	return anyUpdated;
}

const localesPath = getLocalesPath();
console.log(`Mode: ${BUILD_MODE ? "build (dist)" : "dev (source)"}`);
const updated = replaceInLocales(localesPath);

// biome format uniquement en mode dev (inutile de reformater le dist)
if (!BUILD_MODE && updated) {
	exec(`biome format --write ${localesPath}`, (error, stdout, stderr) => {
		if (error) {
			console.error(error);
			return;
		}
		if (stderr) {
			console.error(stderr);
			return;
		}
		console.log(stdout);
	});
}
