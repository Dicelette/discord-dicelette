import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Resultat } from "@dicelette/core";
// biome-ignore lint/suspicious/noTsIgnore: bruh
// @ts-ignore
import { getRoll } from "@dicelette/parse_result";
import { Command } from "commander";

type Options = {
	expression: string;
	iterations: string;
	output?: string;
};

const program = new Command();

program
	.name("analyzeRoll")
	.description("Analyse statistique d’un jet de dés avec export CSV")
	.argument("<expression>", "Expression de dés à analyser (ex: 3d6)")
	.option("-n, --iterations <number>", "Nombre d’itérations", "100000")
	.option("-o, --output <filename>", "Nom du fichier de sortie CSV (optionnel)")
	.parse();

const options = program.opts<Options>();

const args = program.args;
//process args
if (args.length < 1 || !args[0]) {
	console.error("❌ Veuillez fournir une expression de dés à analyser.");
	process.exit(1);
}

const expr = args[0];
options.expression = expr;

//__dirname replacement for ES modules
const dirname = import.meta.dirname;

const root = path.resolve(dirname, "../../");

const defaultFolder = path.join(root, "report", "distribution");

// Ensure the default folder exists
mkdirSync(defaultFolder, { recursive: true });

const defaultPath = path.join(defaultFolder, `${expr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);

const iterations = Number.parseInt(options.iterations, 10);
const output = options.output ?? defaultPath;

const occurrences = new Map<number, number>();

for (let i = 0; i < iterations; i++) {
	const res: Resultat | undefined = getRoll(expr);
	const total = res?.total;
	if (typeof total !== "number") continue;
	occurrences.set(total, (occurrences.get(total) ?? 0) + 1);
}

// Génération du CSV
let csv = "valeur;occurences;pourcentage\n";
const sortedKeys = [...occurrences.keys()].sort((a, b) => a - b);
for (const key of sortedKeys) {
	const count = occurrences.get(key)!;
	const percent = ((count / iterations) * 100).toFixed(4).replace(".", ",");
	csv += `${key};${count};${percent}\n`;
}

writeFileSync(output, csv);
console.log(`✅ Fichier CSV généré : ${output}`);
