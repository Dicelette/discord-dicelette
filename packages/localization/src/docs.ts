import { readFileSync } from "node:fs";
import i18next from "i18next";
import "@dicelette/localization";

type DocTree = { [key: string]: string | DocTree };

const DOCS: DocTree = {
	help: {
		admin: { messageDB: "message_db", messageNoDB: "message_no_db" },
		bug: { message: "bug_report" },
		diceNotation: "dice_notation",
		fr: { message: "feature_request" },
		general: { message: "general" },
		message: "message",
		messageDB: "cmd_db",
		register: { message: "register" },
	},
};

function readDocs(lng: string, tree: DocTree): DocTree {
	return Object.fromEntries(
		Object.entries(tree).map(([key, file]) => [
			key,
			typeof file === "string"
				? readFileSync(new URL(`../docs/${lng}/${file}.md`, import.meta.url), "utf-8")
				: readDocs(lng, file),
		])
	);
}

for (const lng of Object.keys(i18next.store.data))
	i18next.addResourceBundle(lng, "translation", readDocs(lng, DOCS), true);
