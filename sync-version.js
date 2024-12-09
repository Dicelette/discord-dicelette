const fs = require("node:fs");
const path = require("node:path");

// Chemins des fichiers source et cible
const sourcePath = path.resolve(__dirname, "package.json");
const targetPath = path.resolve(__dirname, "packages/bot/package.json");

// Charger les fichiers JSON
const sourceJson = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const targetJson = JSON.parse(fs.readFileSync(targetPath, "utf8"));

// Mettre à jour la version
targetJson.version = sourceJson.version;

// Écrire dans le fichier cible
fs.writeFileSync(targetPath, JSON.stringify(targetJson, null, 2), "utf8");

console.info(`Version mise à jour : ${targetJson.version}`);
