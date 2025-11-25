# Tests E2E - Jets de Dés Basiques

## Prérequis
- Bot connecté et opérationnel
- Permissions d'envoi de messages dans le canal
- Aucune configuration spécifique requise

---

## Scénario 1 : Jet de dés simple

### Test 1.1 : Dé à 20 faces
**Commande :** `/roll dé:1d20`

**Résultat attendu :**
- Message du bot affichant le résultat du jet
- Résultat entre 1 et 20
- Format : `[nom_utilisateur]: 1d20 = [détail] = **[total]**`
- Timestamp présent (si configuré)

**Critères de succès :**
- ✅ Le résultat est un nombre valide
- ✅ Le résultat est dans la plage correcte (1-20)
- ✅ Le format d'affichage est correct
- ✅ Le message est envoyé rapidement (< 1s)

---

### Test 1.2 : Multiples dés
**Commande :** `/roll dé:4d6`

**Résultat attendu :**
- Affichage des 4 jets individuels
- Total calculé correctement
- Format : `4d6 = [1, 2, 3, 4] = **10**`

**Critères de succès :**
- ✅ Chaque dé est affiché individuellement
- ✅ Le total correspond à la somme
- ✅ 4 résultats sont bien présents

---

## Scénario 2 : Modificateurs arithmétiques

### Test 2.1 : Addition simple
**Commande :** `/roll dé:1d20+5`

**Résultat attendu :**
- Jet de dé affiché
- Modificateur +5 ajouté au résultat
- Format : `1d20+5 = [15]+5 = **20**`

**Critères de succès :**
- ✅ Le modificateur est correctement ajouté
- ✅ Le calcul est exact
- ✅ Les deux composants sont visibles

---

### Test 2.2 : Soustraction
**Commande :** `/roll dé:1d20-3`

**Résultat attendu :**
- Modificateur -3 appliqué
- Résultat peut être négatif si le jet est faible

**Critères de succès :**
- ✅ La soustraction fonctionne
- ✅ Les nombres négatifs sont acceptés

---

### Test 2.3 : Opérations multiples
**Commande :** `/roll dé:2d6+1d4+3`

**Résultat attendu :**
- Tous les dés lancés
- Modificateur ajouté
- Total calculé correctement
- Format : `2d6+1d4+3 = [3,5]+[2]+3 = **13**`

**Critères de succès :**
- ✅ Chaque composant est évalué
- ✅ Le total est correct
- ✅ L'ordre des opérations est respecté

---

## Scénario 3 : Comparateurs et seuils

### Test 3.1 : Seuil supérieur
**Commande :** `/roll dé:1d20>=15`

**Résultat attendu :**
- Résultat du jet affiché
- Indication de succès/échec selon le seuil
- Format : `Succès — 1d20>=15 = [18] ≥ 15` ou `Échec — [12] <= 15`

**Critères de succès :**
- ✅ La comparaison est effectuée
- ✅ Le résultat succès/échec est correct
- ✅ Le signe dépend de l'échec ou du succès : `<=` pour échec, `>=` pour le succès.
---

### Test 3.2 : Autres comparateurs
**Commandes à tester :**
- `/roll dé:1d20>10` (strictement supérieur)
- `/roll dé:1d20<=8` (inférieur ou égal)
- `/roll dé:1d20<5` (strictement inférieur)
- `/roll dé:1d20==10` (égalité)
- `/roll dé:1d20!=10` (différent)

**Critères de succès :**
- ✅ Chaque comparateur fonctionne
- ✅ La logique booléenne est correcte

---

## Scénario 4 : Commentaires

### Test 4.1 : Commentaire simple
**Commande :** `/roll dé:1d20 # attaque`

**Résultat attendu :**
- Le commentaire est affiché avec le résultat
- Format : `[attaque] 1d20 = [15] = **15**`

**Critères de succès :**
- ✅ Le commentaire apparaît
- ✅ Le # est correctement interprété

---

### Test 4.2 : Commentaire entre crochets
**Commande :** `/roll dé:1d20 [test de compétence]`

**Résultat attendu :**
- Commentaire affiché différemment du # 
- Le texte entre crochets est préservé

**Critères de succès :**
- ✅ Les deux formats de commentaires fonctionnent
- ✅ Pas de confusion entre les deux

---

## Scénario 5 : Jets multiples (shared rolls)

### Test 5.1 : Plusieurs jets séparés
**Commande :** `/roll dé:1d20; 2d6; 1d8`

**Résultat attendu :**
- Trois jets séparés affichés
- Chaque résultat clairement distinct
- Format avec séparateurs

**Critères de succès :**
- ✅ Les trois jets sont effectués
- ✅ Chaque résultat est individualisé
- ✅ Le séparateur ; fonctionne

---

### Test 5.2 : Jets multiples avec commentaires
**Commande :** `/roll dé:1d20[attaque]; 2d6 # dégâts`

**Résultat attendu :**
- Chaque jet avec son commentaire
- Séparation claire entre les jets

**Critères de succès :**
- ✅ Les commentaires sont associés aux bons jets
- ✅ Pas de mélange entre les résultats

---

## Scénario 6 : Cas limites

### Test 6.1 : Dés à 100 faces
**Commande :** `/roll dé:1d100`

**Critères de succès :**
- ✅ Résultat entre 1 et 100

---

### Test 6.2 : Dé pourcentage
**Commande :** `/roll dé:d%`

**Critères de succès :**
- ✅ Équivalent à 1d100

---

### Test 6.3 : Dés Fudge/Fate
**Commande :** `/roll dé:4dF`

**Résultat attendu :**
- 4 dés avec valeurs -1, 0, ou +1
- Total entre -4 et +4

**Critères de succès :**
- ✅ Les valeurs sont correctes
- ✅ Le format dF est reconnu

---

### Test 6.4 : Très grands nombres
**Commande :** `/roll dé:100d6+500`

**Critères de succès :**
- ✅ Le calcul ne plante pas
- ✅ Le résultat est cohérent
- ✅ Limite raisonnable en place (si configurée)

---

## Scénario 7 : Erreurs attendues

### Test 7.1 : Syntaxe invalide
**Commande :** `/roll dé:invalid`

**Résultat attendu :**
- Message d'erreur clair
- Suggestion de syntaxe correcte

**Critères de succès :**
- ✅ Pas de crash
- ✅ Message d'erreur compréhensible

---

### Test 7.2 : Dé à 0 faces
**Commande :** `/roll dé:1d0`

**Résultat attendu :**
- Erreur : dé invalide

**Critères de succès :**
- ✅ Rejet de l'entrée
- ✅ Message d'erreur approprié

---

### Test 7.3 : Nombre négatif de dés
**Commande :** `/roll dé:-1d20`

**Résultat attendu :**
- Erreur ou interprétation comme modificateur

**Critères de succès :**
- ✅ Comportement cohérent et documenté

---

## Checklist de validation

- [ ] Tous les jets simples fonctionnent
- [ ] Les modificateurs arithmétiques sont corrects
- [ ] Les comparateurs fonctionnent pour tous les opérateurs
- [ ] Les commentaires sont bien affichés
- [ ] Les jets multiples sont séparés correctement
- [ ] Les cas limites sont gérés
- [ ] Les erreurs sont claires et utiles
- [ ] Les performances sont acceptables (< 1s par jet)
- [ ] Aucun crash observé

---

## Notes de test

_Espace pour documenter vos observations lors des tests manuels :_

```
Date : __________
Testeur : __________

Observations :
- 
- 
- 

Bugs trouvés :
- 
- 

```
