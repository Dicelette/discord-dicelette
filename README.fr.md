# Dicelette

→ [DOCUMENTATION](https://dicelette.github.io/) ←

→ [Inviter le bot](https://discord.com/api/oauth2/authorize?client_id=1182819335878754385&permissions=395137215504&scope=bot+applications.commands)

Permet de lancer des dés et d'envoyer le résultat dans un fil de discussion, mais aussi d'enregistrer un modèle de statistique pour les lancer directement (afin de ne pas être obligé d'écrire la même chose encore et encore).

→ Utilise l'API [@diceRoller](https://dice-roller.github.io/documentation/) pour lancer les dés.

# Ajouter une langue

Pour ajouter une langue, vous devez copier et traduire le fichier [`en.json`](./src/localizations/locales/en.json).

> [!IMPORTANT]
> Le nom doit suivre le format des [locales discord.js](https://github.com/discordjs/discord-api-types/blob/main/rest/common.ts#L300).
> Par exemple, `ChineseCN` pour le Chinois (China) et `ChineseTW` pour le Chinois (Taiwan).

Après cela, vous devez ajouter la langue dans le fichier [`i18next.ts`](./src/localizations/i18next.ts), tel que :
```ts
import NouvelleTraduction from "./locales/nouvelleTraduction.json";

export const resources = {
	// ...
	discordLocale: { //ie fr, en-US, etc...
			translation: NouvelleTraduction,
		},
};
```
## Prototype de webdashboard

Un prototype React de dashboard est disponible dans `packages/dashboard`.

### Objectif
- connexion Discord (prototype OAuth2 côté UI),
- détection et sélection des serveurs,
- séparation des vues selon le rôle (`Administrateur` / `Utilisateur`),
- configuration du bot par serveur avec API dashboard côté bot ; la persistance cible Enmap quand le backend est disponible.

### Lancer le prototype
```bash
pnpm dashboard:dev
```

### Construire le prototype
```bash
pnpm dashboard:build
```
