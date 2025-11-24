# Tests E2E - Critiques Personnalisés

## Prérequis
- Personnage enregistré
- Compréhension du système de critiques

---

## Scénario 1 : Critiques sur dés naturels

### Test 1.1 : Critique de succès naturel
**Configuration template :** Critique sur 20 naturel (dé non modifié)

**Commande :** `/roll dice:1d20>=10 {*cs:==20}`

**Test :**
1. Lancer plusieurs fois jusqu'à obtenir 20 naturel
2. Vérifier que le critique est détecté

**Résultat attendu :**
- Indicateur de critique (emoji, couleur, texte)
- Format : `1d20 = **[20]** ✨ CRITIQUE !`

**Critères de succès :**
- ✅ Le 20 naturel déclenche le critique
- ✅ Visualisation claire du critique
- ✅ Le modificateur n'affecte pas la détection

---

### Test 1.2 : Critique d'échec naturel
**Commande :** `/roll dice:1d20>=10 {*cf:==1}`

**Résultat attendu (sur 1 naturel) :**
- Indicateur d'échec critique
- Format : `1d20 = **[1]** 💀 ÉCHEC CRITIQUE !`

**Critères de succès :**
- ✅ Le 1 naturel déclenche l'échec critique
- ✅ Distinction visuelle succès/échec

---

### Test 1.3 : Critique sans astérisque (résultat total)
**Commande :** `/roll dice:1d20+5>=15 {cs:>=25}`

**Test :** Lancer jusqu'à avoir total ≥ 25

**Résultat attendu :**
- Critique basé sur résultat total (pas dé naturel)
- Ex: [20]+5 = **25** déclenche critique

**Critères de succès :**
- ✅ Critique sur résultat total fonctionne
- ✅ Distinction avec critique naturel claire

---

## Scénario 2 : Plages de critiques

### Test 2.1 : Critique sur plage (>=)
**Commande :** `/roll dice:1d20 {*cs:>=18}`

**Résultat attendu :**
- Critique sur 18, 19, 20 naturels
- Pas de critique sur 17 et moins

**Critères de succès :**
- ✅ La plage fonctionne correctement
- ✅ Tous les cas sont couverts

---

### Test 2.2 : Échec critique sur plage (<=)
**Commande :** `/roll dice:1d20 {*cf:<=3}`

**Résultat attendu :**
- Échec critique sur 1, 2, 3
- Pas d'échec critique sur 4+

**Critères de succès :**
- ✅ Plage d'échec fonctionnelle
- ✅ Seuil correct

---

## Scénario 3 : Critiques avec comparateurs variés

### Test 3.1 : Critique avec >
**Commande :** `/roll dice:1d20 {*cs:>15}`

**Critères de succès :**
- ✅ Strictement supérieur (16+)
- ✅ 15 ne déclenche pas

---

### Test 3.2 : Critique avec <
**Commande :** `/roll dice:1d20 {*cf:<5}`

**Critères de succès :**
- ✅ Strictement inférieur (1-4)
- ✅ 5 ne déclenche pas

---

### Test 3.3 : Critique sur égalité
**Commande :** `/roll dice:1d20 {*cs:==20}`

**Critères de succès :**
- ✅ Seulement sur 20 exact
- ✅ 19 et 21 ignorés (si possible)

---

## Scénario 4 : Critiques multiples

### Test 4.1 : Succès ET échec définis
**Commande :** `/roll dice:1d20 {*cs:>=18}{*cf:<=2}`

**Résultat attendu :**
- Sur 18-20 : critique succès
- Sur 1-2 : critique échec
- Sur 3-17 : normal

**Critères de succès :**
- ✅ Les deux conditions coexistent
- ✅ Pas de conflit/interférence

---

### Test 4.2 : Critiques avec noms personnalisés
**Commande :** `/roll dice:1d20 {cs:>=20 Super Succès}{cf:<=1 Catastrophe}`

**Résultat attendu :**
- Message personnalisé au lieu de "CRITIQUE"
- Ex: "**Super Succès !**" sur 20

**Critères de succès :**
- ✅ Texte personnalisé affiché
- ✅ Lisibilité préservée

---

## Scénario 5 : Critiques dans le template

### Test 5.1 : Template avec critiques par défaut
**Configuration :** Template définit `cs:>=19` par défaut

**Commande :** `/roll dice:1d20` (sans spécifier critique)

**Résultat attendu :**
- Critiques du template appliqués automatiquement
- Pas besoin de les répéter à chaque jet

**Critères de succès :**
- ✅ Critiques template actifs
- ✅ Application automatique

---

### Test 5.2 : Override des critiques template
**Template :** `cs:>=19`
**Commande :** `/roll dice:1d20 {*cs:==20}`

**Résultat attendu :**
- Le critique de la commande remplace celui du template
- Seulement 20 déclenche (pas 19)

**Critères de succès :**
- ✅ Override fonctionne
- ✅ Priorité commande > template

---

## Scénario 6 : Critiques avec statistiques

### Test 6.1 : Seuil basé sur statistique
**Commande :** `/roll dice:1d20+force {cs:>=force*2}`

**Exemple :** Si force=10, critique sur total ≥20

**Résultat attendu :**
- La statistique est évaluée dans le seuil
- Critique déclenché dynamiquement

**Critères de succès :**
- ✅ Expression avec stat évaluée
- ✅ Calcul correct

---

### Test 6.2 : Critique avec $
**Commande :** `/roll dice:1d20+$ {cs:>=$} statvalue:15`

**Résultat attendu :**
- $ remplacé par 15 dans jet et critique
- Critique si total ≥15

**Critères de succès :**
- ✅ Substitution de $ fonctionnelle
- ✅ Cohérence jet/critique

---

## Scénario 7 : Affichage et visualisation

### Test 7.1 : Émojis de critique
**Vérifier :**
- Succès critique : emoji positif (✨, ⭐, 🎯)
- Échec critique : emoji négatif (💀, ❌, 💥)

**Critères de succès :**
- ✅ Émojis affichés correctement
- ✅ Distinction visuelle claire

---

### Test 7.2 : Couleurs d'embed
**Vérifier (si applicable) :**
- Embed vert/doré pour succès critique
- Embed rouge pour échec critique

**Critères de succès :**
- ✅ Couleurs appropriées
- ✅ Contraste suffisant

---

### Test 7.3 : Format du message
**Format attendu :**
```
[Utilisateur] : Attaque
1d20+5 = [18]+5 = **23** ≥ 15 ✓
✨ Critique de Succès ! ✨
```

**Critères de succès :**
- ✅ Lisible et structuré
- ✅ Informations claires

---

## Scénario 8 : Cas limites

### Test 8.1 : Critique impossible
**Commande :** `/roll dice:1d6 {*cs:>=10}`

**Résultat attendu :**
- Avertissement : critique impossible sur ce dé
- OU fonctionnement normal sans jamais déclencher

**Critères de succès :**
- ✅ Pas de bug
- ✅ Comportement cohérent

---

### Test 8.2 : Critiques contradictoires
**Commande :** `/roll dice:1d20 {*cs:>=20}{*cf:>=20}`

**Résultat attendu :**
- Gestion du conflit (priorité ou erreur)
- Message clair si problème

**Critères de succès :**
- ✅ Pas de crash
- ✅ Comportement documenté

---

### Test 8.3 : Syntaxe invalide
**Commandes invalides à tester :**
- `/roll dice:1d20 {cs:invalid}`
- `/roll dice:1d20 {cs:}`
- `/roll dice:1d20 {cs:==abc}`

**Critères de succès :**
- ✅ Erreurs détectées
- ✅ Messages explicites

---

## Scénario 9 : Critiques et jets multiples

### Test 9.1 : Critiques sur shared rolls
**Commande :** `/roll dice:1d20 {*cs:>=18}; 2d6 {cs:>=10}`

**Résultat attendu :**
- Chaque jet a ses propres critiques
- Évaluation indépendante

**Critères de succès :**
- ✅ Séparation correcte
- ✅ Pas de confusion entre jets

---

## Checklist de validation

- [ ] Critiques naturels (* préfixe) fonctionnent
- [ ] Critiques sur total fonctionnent
- [ ] Tous les comparateurs (>=, <=, ==, >, <) OK
- [ ] Critiques multiples (succès + échec) coexistent
- [ ] Critiques template par défaut appliqués
- [ ] Override des critiques possible
- [ ] Statistiques dans seuils fonctionnelles
- [ ] Affichage clair et distinctif
- [ ] Cas limites gérés proprement
- [ ] Syntaxe invalide détectée

---

## Notes de test

```
Date : __________
Testeur : __________
Template utilisé : __________

Critiques testés :
- 
- 

Observations :
- 
- 

Bugs trouvés :
- 
- 

```
