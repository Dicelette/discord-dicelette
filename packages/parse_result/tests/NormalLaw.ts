import { writeFileSync } from "node:fs";
import type { Resultat } from "@dicelette/core";
import { Command } from "commander";
import { getRoll } from "../src/dice_extractor";

const program = new Command();

program
	.name("analyzeRoll")
	.description("Analyse statistique d’un jet de dés avec export CSV")
	.argument("<expression>", "Expression de dés à analyser (ex: 3d6)")
	.option("-n, --iterations <number>", "Nombre d’itérations", "100000")
	.option("-o, --output <filename>", "Nom du fichier de sortie CSV (optionnel)")
	.parse();
const expr = program.args[0];
const iterations = Number.parseInt(program.opts().iterations, 10);
const output =
	program.opts().output ?? `distribution_${expr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

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
