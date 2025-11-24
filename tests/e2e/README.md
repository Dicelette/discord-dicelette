# Tests End-to-End (E2E) - Manuel Discord

Ce dossier contient les scénarios de tests manuels à exécuter sur Discord pour valider les fonctionnalités du bot qui ne peuvent pas être testées de manière unitaire.

## Structure des tests

Chaque fichier de test contient :
- **Prérequis** : Configuration nécessaire avant le test
- **Scénarios** : Liste des cas à tester avec entrées/sorties attendues
- **Critères de succès** : Indicateurs de validation
- **Cas limites** : Situations particulières à vérifier

## Comment exécuter les tests

1. Assurez-vous que le bot est démarré et connecté à Discord
2. Créez un serveur de test ou utilisez un canal dédié
3. Suivez les scénarios dans l'ordre indiqué
4. Cochez ✅ les tests réussis, ❌ les échecs
5. Documentez tout comportement inattendu

## Organisation des fichiers

- `01-dice-rolling.md` - Tests de jets de dés basiques
- `02-character-sheets.md` - Tests de création et gestion de fiches
- `03-statistics.md` - Tests de statistiques et calculs
- `04-custom-criticals.md` - Tests de critiques personnalisés
- `05-macros-snippets.md` - Tests de macros et snippets
- `06-permissions.md` - Tests de permissions et rôles
- `07-interactions.md` - Tests d'interactions complexes
- `08-edge-cases.md` - Tests de cas limites et erreurs

## Environnement de test

- Serveur Discord de test requis
- Bot avec permissions administrateur
- Plusieurs comptes utilisateurs pour tester les interactions
- Canaux textuels et vocaux disponibles

## Rapport de bugs

Si vous trouvez un bug lors des tests :
1. Notez le scénario exact
2. Capturez des screenshots si possible
3. Vérifiez les logs du bot
4. Créez une issue GitHub avec le tag `E2E-Test-Failure`
