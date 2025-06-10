import fs from "node:fs";
import path from "node:path";

type Target = Record<string, string>;

const sourcePath = path.resolve("./docs/");

const languages = ["en", "fr"];

const pathToReplace: Target = {
	"help.admin.messageDB": "message_db",
	"help.admin.messageNoDB": "message_no_db",
	"help.bug.message": "bug_report",
	"help.diceNotation": "dice_notation",
	"help.fr.message": "feature_request",
	"help.message": "message",
	"help.messageDB": "cmd_db",
	"help.register.message": "register",
};

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

function replaceInLocales(dryRun?: boolean) {
	for (const lang of languages) {
		const output: Target = {};
		for (const [key, value] of Object.entries(pathToReplace)) {
			const filePath = path.join(sourcePath, lang, `${value}.md`);
			if (fs.existsSync(filePath)) output[key] = fs.readFileSync(filePath, "utf-8");
			else console.warn(`File not found: ${filePath}`);
		}
		//console.log(output);
		const outputPath = path.resolve(`../localization/locales/${lang}.json`);
		if (fs.existsSync(outputPath)) {
			const existingContent = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
			//as the key is in the form of "key1.key2.key3" we need to split by . and update the existing content
			for (const [key, value] of Object.entries(output))
				setNestedKey(existingContent, key, value);

			if (!dryRun) fs.writeFileSync(outputPath, JSON.stringify(existingContent, null, 2));
			else console.log(existingContent.help.diceNotation);
			console.log(`Updated ${lang}.json with new content.`);
		} else {
			console.warn(`File not found: ${outputPath}`);
		}
	}
}

replaceInLocales();
