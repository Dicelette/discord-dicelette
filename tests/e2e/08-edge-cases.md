# Tests E2E - Cas Limites et Gestion d'Erreurs

## Prérequis
- Serveur de test configuré
- Personnage enregistré
- Accès à différents types d'utilisateurs (standard, admin)

---

## Scénario 1 : Limites des dés

### Test 1.1 : Nombre excessif de dés
**Commande :** `/roll dice:1000d20`

**Résultat attendu :**
- Erreur : trop de dés
- Limite indiquée (ex: max 100 dés)

**Critères de succès :**
- ✅ Limite appliquée
- ✅ Message d'erreur clair
- ✅ Pas de crash

---

### Test 1.2 : Dé avec trop de faces
**Commande :** `/roll dice:1d999999999`

**Résultat attendu :**
- Erreur : dé invalide
- Limite suggérée (ex: max 1000 faces)

**Critères de succès :**
- ✅ Validation des faces
- ✅ Pas de calcul impossible

---

### Test 1.3 : Dé négatif ou zéro
**Commandes à tester :**
- `/roll dice:-5d20`
- `/roll dice:1d0`
- `/roll dice:0d20`

**Résultat attendu :**
- Erreur : valeur invalide
- Explication claire

**Critères de succès :**
- ✅ Validation stricte
- ✅ Messages explicites

---

### Test 1.4 : Total excessif
**Commande :** `/roll dice:100d100+9999999`

**Résultat attendu :**
- Calcul effectué OU erreur si dépassement limite numérique
- Pas de crash/overflow

**Critères de succès :**
- ✅ Gestion des grands nombres
- ✅ Limites documentées

---

## Scénario 2 : Formules invalides

### Test 2.1 : Syntaxe incorrecte
**Commandes invalides :**
- `/roll dice:1d20++5`
- `/roll dice:1d20 +`
- `/roll dice:abc`
- `/roll dice:1d20++force`

**Résultat attendu :**
- Erreur de syntaxe
- Indication de la partie problématique

**Critères de succès :**
- ✅ Toutes les erreurs détectées
- ✅ Messages utiles

---

### Test 2.2 : Division par zéro
**Commande :** `/roll dice:1d20/0`

**Résultat attendu :**
- Erreur : division par zéro
- Pas de crash

**Critères de succès :**
- ✅ Erreur interceptée
- ✅ Bot reste opérationnel

---

### Test 2.3 : Parenthèses déséquilibrées
**Commandes :**
- `/roll dice:(1d20+5`
- `/roll dice:1d20)+5`
- `/roll dice:((1d20)`

**Critères de succès :**
- ✅ Erreurs détectées
- ✅ Indication du problème

---

### Test 2.4 : Caractères invalides
**Commandes :**
- `/roll dice:1d20&5`
- `/roll dice:1d20@force`
- `/roll dice:1d20#test`

**Critères de succès :**
- ✅ Caractères non autorisés rejetés
- ✅ Message explicatif

---

## Scénario 3 : Statistiques problématiques

### Test 3.1 : Statistique inexistante
**Commande :** `/roll dice:1d20+stat_inexistante`

**Résultat attendu :**
- Erreur : statistique non trouvée
- Liste des stats disponibles (optionnel)

**Critères de succès :**
- ✅ Détection immédiate
- ✅ Aide à la résolution

---

### Test 3.2 : Boucle dans stats calculées
**Configuration :**
- `statA: =statB`
- `statB: =statA`

**Commande :** `/character show stat:statA`

**Résultat attendu :**
- Erreur : dépendance circulaire
- Pas de calcul infini

**Critères de succès :**
- ✅ Détection de récursion
- ✅ Pas de freeze

---

### Test 3.3 : Type de stat invalide
**Actions :**
1. Tenter de créer stat avec valeur non-numérique : `classe: "Guerrier"`
2. Utiliser dans calcul : `/roll dice:1d20+classe`

**Résultat attendu :**
- Erreur : type incompatible
- Indication du problème

**Critères de succès :**
- ✅ Validation des types
- ✅ Message clair

---

## Scénario 4 : Limites de longueur

### Test 4.1 : Nom très long
**Commandes :**
- Macro avec nom de 500 caractères
- Personnage avec nom très long

**Résultat attendu :**
- Limite appliquée (ex: 100 caractères)
- Erreur explicite

**Critères de succès :**
- ✅ Validation de longueur
- ✅ Pas de débordement

---

### Test 4.2 : Commentaire excessif
**Commande :** `/roll dice:1d20 # [commentaire de 2000 caractères]`

**Résultat attendu :**
- Commentaire tronqué OU erreur
- Limite indiquée

**Critères de succès :**
- ✅ Gestion propre
- ✅ Pas d'impact sur embed Discord

---

### Test 4.3 : Formule très complexe
**Commande :** Formule avec 50+ termes et opérations

**Critères de succès :**
- ✅ Calcul effectué si dans limites
- ✅ Erreur si trop complexe
- ✅ Temps de réponse acceptable

---

## Scénario 5 : Permissions et sécurité

### Test 5.1 : Injection de commande
**Tentatives malveillantes :**
- `/roll dice:1d20; /admin reset`
- `/roll dice:$(malicious_command)`

**Résultat attendu :**
- Tentatives neutralisées
- Pas d'exécution de code arbitraire

**Critères de succès :**
- ✅ Sanitization efficace
- ✅ Sécurité préservée

---

### Test 5.2 : Escalade de privilèges
**Actions :**
1. Utilisateur standard tente `/admin` via manipulation
2. Modifier ID utilisateur dans requête

**Résultat attendu :**
- Toutes tentatives échouent
- Permissions vérifiées côté serveur

**Critères de succès :**
- ✅ Pas de bypass possible
- ✅ Validation robuste

---

### Test 5.3 : Spam de commandes
**Actions :** Lancer 100 commandes `/roll` en 10 secondes

**Résultat attendu :**
- Rate limiting appliqué
- Message : "trop de requêtes, attendez X secondes"

**Critères de succès :**
- ✅ Protection contre spam
- ✅ Bot reste réactif pour autres utilisateurs

---

## Scénario 6 : Données corrompues

### Test 6.1 : Base de données corrompue
**Simulation :** Modifier manuellement DB pour créer entrée invalide

**Actions :** Tenter d'accéder au personnage corrompu

**Résultat attendu :**
- Erreur gracieuse
- Possibilité de réinitialiser/réparer

**Critères de succès :**
- ✅ Pas de crash bot
- ✅ Option de récupération

---

### Test 6.2 : Fichier d'import malformé
**Actions :** Importer CSV/JSON avec structure invalide

**Résultat attendu :**
- Erreur de validation
- Indication des problèmes dans le fichier

**Critères de succès :**
- ✅ Validation avant import
- ✅ Pas de corruption des données existantes

---

## Scénario 7 : Limites réseau et Discord

### Test 7.1 : Message trop long
**Commande :** Jet générant résultat > 2000 caractères

**Résultat attendu :**
- Message tronqué avec indication
- OU résultat envoyé en plusieurs messages
- OU fichier texte attaché

**Critères de succès :**
- ✅ Pas d'erreur Discord
- ✅ Contenu préservé

---

### Test 7.2 : Trop d'embeds
**Actions :** Commande générant > 10 embeds

**Résultat attendu :**
- Pagination ou limitation
- Pas d'erreur Discord

**Critères de succès :**
- ✅ Limites Discord respectées

---

### Test 7.3 : Bot hors ligne
**Simulation :** Bot déconnecté pendant commande

**Résultat attendu :**
- Timeout utilisateur
- Reconnexion automatique du bot

**Critères de succès :**
- ✅ Reprise après reconnexion
- ✅ Pas de perte de données

---

## Scénario 8 : Cas d'utilisation extrêmes

### Test 8.1 : Personnage sans statistiques
**Configuration :** Personnage enregistré, 0 stats définies

**Commande :** `/roll dice:1d20+force`

**Résultat attendu :**
- Erreur : aucune stat définie
- Suggestion de configurer personnage

**Critères de succès :**
- ✅ Détection du problème
- ✅ Aide à l'utilisateur

---

### Test 8.2 : Aucun personnage enregistré
**Utilisateur nouveau :** Tente `/roll dice:1d20+force`

**Résultat attendu :**
- Erreur : pas de personnage
- Invitation à s'enregistrer

**Critères de succès :**
- ✅ Onboarding clair
- ✅ Instructions utiles

---

### Test 8.3 : Serveur sans configuration
**Nouveau serveur :** Bot ajouté, aucune config

**Actions :** Utiliser commandes basiques

**Résultat attendu :**
- Configuration par défaut appliquée
- Commandes fonctionnent

**Critères de succès :**
- ✅ Defaults raisonnables
- ✅ Utilisabilité immédiate

---

## Scénario 9 : Edge cases spécifiques

### Test 9.1 : Critique impossible
**Commande :** `/roll dice:1d6 {*cs:>=20}`

**Résultat attendu :**
- Avertissement : seuil impossible
- OU jet sans jamais déclencher critique

**Critères de succès :**
- ✅ Pas de bug
- ✅ Comportement cohérent

---

### Test 9.2 : Threshold contradictoire
**Commande :** `/roll dice:1d20>=15<=10`

**Résultat attendu :**
- Erreur : seuils contradictoires
- Explication

**Critères de succès :**
- ✅ Détection de l'incohérence

---

### Test 9.3 : Jets négatifs
**Commandes :**
- `/roll dice:-1d20`
- `/roll dice:1d20+-10`

**Critères de succès :**
- ✅ Validation correcte
- ✅ Résultats cohérents ou erreur

---

## Scénario 10 : Performance sous charge

### Test 10.1 : Calcul intensif
**Commande :** `/roll dice:100d100+100d100+100d100`

**Critères de succès :**
- ✅ Temps de réponse < 5s
- ✅ Pas de timeout

---

### Test 10.2 : Nombreux utilisateurs simultanés
**Simulation :** 50 utilisateurs lancent commandes en même temps

**Critères de succès :**
- ✅ Toutes les commandes traitées
- ✅ Latence acceptable (< 10s)
- ✅ Pas de crash

---

## Scénario 11 : Récupération d'erreurs

### Test 11.1 : Erreur pendant sauvegarde
**Simulation :** DB devient inaccessible pendant modification

**Résultat attendu :**
- Erreur signalée à l'utilisateur
- Tentative de retry (optionnel)
- Données non corrompues

**Critères de succès :**
- ✅ Intégrité préservée
- ✅ Message d'erreur approprié

---

### Test 11.2 : Crash et reprise
**Actions :**
1. Bot crash pendant une partie
2. Bot redémarre
3. Utilisateurs relancent commandes

**Résultat attendu :**
- Reprise normale
- Données persistées intactes

**Critères de succès :**
- ✅ Aucune perte de données
- ✅ Fonctionnement restauré

---

## Checklist de validation

- [ ] Limites de dés appliquées (nombre, faces)
- [ ] Toutes syntaxes invalides détectées
- [ ] Division par zéro gérée
- [ ] Stats inexistantes/invalides détectées
- [ ] Récursion infinie évitée
- [ ] Limites de longueur respectées
- [ ] Injection de code impossible
- [ ] Rate limiting fonctionnel
- [ ] Données corrompues gérées proprement
- [ ] Limites Discord respectées
- [ ] Cas sans personnage/stats géré
- [ ] Edge cases mathématiques OK
- [ ] Performance acceptable sous charge
- [ ] Récupération après erreur/crash

---

## Notes de test

```
Date : __________
Testeur : __________

Erreurs testées :
- 
- 

Comportements observés :
- 
- 

Bugs critiques :
- 
- 

Suggestions d'amélioration :
- 
- 

```
