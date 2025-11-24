# Tests E2E - Macros et Snippets

## Prérequis
- Personnage enregistré avec statistiques
- Permissions d'utilisation des commandes

---

## Scénario 1 : Création de macros

### Test 1.1 : Créer une macro simple
**Commande :** `/macro add name:attaque_basique formula:1d20+force`

**Résultat attendu :**
- Confirmation : macro créée
- Macro visible avec `/macro list`
- Formula enregistrée correctement

**Critères de succès :**
- ✅ La macro est créée
- ✅ Le nom est enregistré
- ✅ La formule est stockée

---

### Test 1.2 : Créer macro avec plusieurs dés
**Commande :** `/macro add name:degats_critiques formula:4d6+2d8+force`

**Critères de succès :**
- ✅ Formule complexe acceptée
- ✅ Tous les composants enregistrés

---

### Test 1.3 : Créer macro avec commentaire
**Commande :** `/macro add name:initiative formula:1d20+dexterite # test d'initiative`

**Critères de succès :**
- ✅ Le commentaire est préservé
- ✅ Affichage correct lors de l'utilisation

---

## Scénario 2 : Utilisation de macros

### Test 2.1 : Lancer une macro
**Commande :** `/roll dice:$attaque_basique`

**Résultat attendu :**
- La formule de la macro est exécutée
- Les statistiques sont substituées
- Format : `[attaque_basique] 1d20+15 = [12]+15 = **27**`

**Critères de succès :**
- ✅ La macro est trouvée et exécutée
- ✅ Les stats sont remplacées
- ✅ Le nom de la macro apparaît

---

### Test 2.2 : Autocomplétion des macros
**Action :** Taper `/roll dice:$` et attendre

**Résultat attendu :**
- Liste de toutes les macros disponibles
- Prévisualisation de la formule (si possible)

**Critères de succès :**
- ✅ Toutes les macros sont listées
- ✅ L'autocomplétion est réactive

---

### Test 2.3 : Macro avec threshold
**Commande :** `/roll dice:$attaque_basique threshold:>=15`

**Résultat attendu :**
- La macro est lancée
- Le threshold override la valeur dans la macro (si présente)
- Comparaison appliquée au résultat

**Critères de succès :**
- ✅ Le threshold fonctionne
- ✅ Override correct si conflit

---

## Scénario 3 : Gestion des macros

### Test 3.1 : Lister toutes les macros
**Commande :** `/macro list`

**Résultat attendu :**
- Embed ou liste avec toutes les macros
- Nom et formule pour chaque macro
- Pagination si > 10 macros

**Critères de succès :**
- ✅ Toutes les macros sont affichées
- ✅ Format lisible
- ✅ Pagination fonctionnelle (si applicable)

---

### Test 3.2 : Supprimer une macro
**Commande :** `/macro delete name:attaque_basique`

**Résultat attendu :**
- Confirmation de suppression
- Macro n'apparaît plus dans `/macro list`
- Tentative d'utilisation échoue avec erreur claire

**Critères de succès :**
- ✅ Suppression effective
- ✅ Confirmation demandée (optionnel)

---

### Test 3.3 : Éditer une macro existante
**Commande :** `/macro edit name:degats_critiques formula:5d6+3d8+force`

**Résultat attendu :**
- Ancienne formule remplacée
- Nouvelle formule active immédiatement

**Critères de succès :**
- ✅ La modification est enregistrée
- ✅ Pas de doublon créé

---

## Scénario 4 : Snippets personnels

### Test 4.1 : Créer un snippet
**Commande :** `/snippet add name:heal formula:2d8+constitution # soin`

**Résultat attendu :**
- Snippet créé pour l'utilisateur courant
- Séparé des macros (scope personnel)

**Critères de succès :**
- ✅ Le snippet est créé
- ✅ Différenciation macro/snippet claire

---

### Test 4.2 : Utiliser un snippet
**Commande :** `/roll dice:@heal`

**Résultat attendu :**
- Le snippet de l'utilisateur est exécuté
- Formule personnelle utilisée

**Critères de succès :**
- ✅ Notation @ pour snippets fonctionne
- ✅ Séparation avec $ (macros)

---

### Test 4.3 : Snippets non partagés
**Actions :**
1. Utilisateur A crée snippet `@test`
2. Utilisateur B tente `/roll dice:@test`

**Résultat attendu :**
- Utilisateur B : erreur "snippet non trouvé"
- Les snippets restent personnels

**Critères de succès :**
- ✅ Isolation des snippets par utilisateur
- ✅ Message d'erreur approprié

---

## Scénario 5 : Cas limites et complexité

### Test 5.1 : Macro avec plusieurs statistiques
**Commande :** `/macro add name:complex formula:1d20+force+dexterite+constitution`

**Critères de succès :**
- ✅ Toutes les stats sont reconnues
- ✅ Calcul correct avec multiples stats

---

### Test 5.2 : Macro avec jets multiples
**Commande :** `/macro add name:multi formula:1d20+force; 2d6+dexterite`

**Critères de succès :**
- ✅ Jets séparés fonctionnels dans macro
- ✅ Chaque partie calculée indépendamment

---

### Test 5.3 : Nom de macro avec caractères spéciaux
**Commandes à tester :**
- `/macro add name:attaque-spéciale formula:1d20` (tiret, accent)
- `/macro add name:compétence_test formula:1d20` (underscore)

**Critères de succès :**
- ✅ Caractères acceptés ou rejetés clairement
- ✅ Pas de bugs avec caractères spéciaux

---

### Test 5.4 : Très longue formule
**Commande :** `/macro add name:ultra formula:1d20+2d6+3d8+1d4+force+dex+con+5+10-2`

**Critères de succès :**
- ✅ Limite de longueur respectée
- ✅ Formule enregistrée si dans limites
- ✅ Erreur claire si trop longue

---

## Scénario 6 : Conflits et erreurs

### Test 6.1 : Doublon de nom
**Actions :**
1. Créer macro `attaque`
2. Créer à nouveau macro `attaque`

**Résultat attendu :**
- Erreur : nom déjà utilisé
- Proposition de remplacement ou choix d'un autre nom

**Critères de succès :**
- ✅ Pas d'écrasement silencieux
- ✅ Message d'erreur utile

---

### Test 6.2 : Macro inexistante
**Commande :** `/roll dice:$inexistante`

**Résultat attendu :**
- Erreur : macro non trouvée
- Liste des macros disponibles (optionnel)

**Critères de succès :**
- ✅ Erreur claire
- ✅ Aide à l'utilisateur

---

### Test 6.3 : Formule invalide dans macro
**Commande :** `/macro add name:broken formula:invalid_dice`

**Résultat attendu :**
- Validation au moment de la création (idéal)
- OU erreur au moment de l'exécution avec indication

**Critères de succès :**
- ✅ Formule validée
- ✅ Message d'erreur si invalide

---

## Scénario 7 : Macros globales (serveur)

### Test 7.1 : Macro serveur vs personnelle
**Prérequis :** Permissions admin

**Actions :**
1. Admin crée macro serveur
2. Utilisateur normal utilise la macro

**Critères de succès :**
- ✅ Macro accessible à tous
- ✅ Distinction macro serveur/perso claire

---

### Test 7.2 : Priorité macro personnelle
**Actions :**
1. Macro serveur `test` existe
2. Utilisateur crée macro perso `test`
3. Utilisateur lance `$test`

**Résultat attendu :**
- Macro personnelle prioritaire
- OU indication explicite du conflit

**Critères de succès :**
- ✅ Comportement de priorité cohérent
- ✅ Documenté

---

## Scénario 8 : Performance et limites

### Test 8.1 : Nombre maximum de macros
**Actions :** Créer des macros jusqu'à la limite (ex: 50)

**Critères de succès :**
- ✅ Limite appliquée
- ✅ Message clair en cas de dépassement
- ✅ Performances acceptables avec max macros

---

### Test 8.2 : Temps d'exécution macro complexe
**Macro :** Formule très complexe avec stats multiples

**Critères de succès :**
- ✅ Temps de réponse < 2s
- ✅ Pas de timeout

---

## Checklist de validation

- [ ] Création de macros simple et complexe
- [ ] Utilisation avec substitution de stats
- [ ] Gestion (list, edit, delete) fonctionnelle
- [ ] Snippets personnels isolés
- [ ] Autocomplétion opérationnelle
- [ ] Threshold compatible avec macros
- [ ] Gestion des erreurs claire
- [ ] Conflits de noms gérés
- [ ] Limites respectées
- [ ] Performances acceptables

---

## Notes de test

```
Date : __________
Testeur : __________

Macros testées :
- 
- 

Observations :
- 
- 

Bugs trouvés :
- 
- 

```
