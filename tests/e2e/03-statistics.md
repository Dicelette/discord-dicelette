# Tests E2E - Statistiques

## Prérequis
- Personnage enregistré avec statistiques variées
- Comprendre les différents types de stats (numériques, dés, modificateurs)

---

## Scénario 1 : Statistiques numériques simples

### Test 1.1 : Affichage des statistiques
**Commande :** `/character show`

**Résultat attendu :**
- Liste complète des statistiques
- Format clair : `Force: 15`, `Dextérité: 12`
- Groupement par catégories (si applicable)

**Critères de succès :**
- ✅ Toutes les stats affichées
- ✅ Valeurs correctes
- ✅ Lisibilité

---

### Test 1.2 : Utilisation dans jet de dés
**Commande :** `/roll dice:1d20+force`

**Avec force=15 :**
- Résultat : `1d20+15 = [10]+15 = **25**`

**Critères de succès :**
- ✅ Statistique correctement substituée
- ✅ Calcul exact
- ✅ Affichage du nom de la stat

---

### Test 1.3 : Statistiques avec noms composés
**Configuration :** Stat `points_de_vie:50` ou `Classe d'Armure:18`

**Commande :** `/roll dice:1d20+classe_d_armure`

**Critères de succès :**
- ✅ Espaces/underscores gérés
- ✅ Reconnaissance correcte
- ✅ Pas de confusion entre stats similaires

---

## Scénario 2 : Statistiques de type dé

### Test 2.1 : Stat définie comme dé
**Configuration :** `degats_arme: 2d6+3`

**Commande :** `/roll dice:degats_arme`

**Résultat attendu :**
- Dé lancé : `2d6+3 = [4+5]+3 = **12**`
- Les dés sont évalués, pas affichés comme texte

**Critères de succès :**
- ✅ Dé lancé correctement
- ✅ Pas d'affichage littéral "2d6+3"

---

### Test 2.2 : Combinaison stat numérique + dé
**Configuration :**
- `force: 15`
- `degats_epee: 1d8`

**Commande :** `/roll dice:degats_epee+force`

**Résultat attendu :**
- `1d8+15 = [6]+15 = **21**`

**Critères de succès :**
- ✅ Combinaison fonctionnelle
- ✅ Types de stats mixés

---

## Scénario 3 : Modificateurs de statistiques

### Test 3.1 : Modificateur temporaire
**Commande :** `/character modify stat:force value:+5 temporary:true`

**Vérifications :**
1. `/character show` affiche `Force: 20 (15+5)`
2. `/roll dice:1d20+force` utilise 20
3. Après reset/repos : retour à 15

**Critères de succès :**
- ✅ Modificateur appliqué
- ✅ Distinction valeur base/modifiée
- ✅ Temporaire géré correctement

---

### Test 3.2 : Modificateur permanent
**Commande :** `/character modify stat:force value:+2 temporary:false`

**Résultat attendu :**
- Force passe de 15 à 17 définitivement
- Pas d'indication "(+2)" dans l'affichage
- Persisté après relance bot

**Critères de succès :**
- ✅ Modification permanente
- ✅ Sauvegarde persistante

---

### Test 3.3 : Réduction de statistique
**Commande :** `/character modify stat:pv value:-10`

**Avec PV initiaux = 50 :**
- Nouveau PV = 40

**Critères de succès :**
- ✅ Valeurs négatives acceptées
- ✅ Calcul correct

---

## Scénario 4 : Statistiques dans formules complexes

### Test 4.1 : Opérations mathématiques avec stats
**Commande :** `/roll dice:1d20+(force+dexterite)/2`

**Avec force=15, dexterite=12 :**
- `1d20+(15+12)/2 = 1d20+13.5`
- Résultat avec arrondi ou décimale

**Critères de succès :**
- ✅ Expression complexe évaluée
- ✅ Ordre des opérations correct
- ✅ Gestion des décimales

---

### Test 4.2 : Statistique dans threshold
**Commande :** `/roll dice:1d20+force>=constitution`

**Avec force=15, constitution=14 :**
- Seuil = 14
- Comparaison sur résultat total

**Critères de succès :**
- ✅ Stat dans seuil évaluée
- ✅ Comparaison correcte

---

## Scénario 5 : Groupes et catégories de stats

### Test 5.1 : Affichage par catégorie
**Configuration :**
```
Attributs:
  - Force: 15
  - Dextérité: 12
Compétences:
  - Athlétisme: 5
  - Discrétion: 8
```

**Commande :** `/character show category:Attributs`

**Critères de succès :**
- ✅ Filtrage par catégorie fonctionnel
- ✅ Organisation claire

---

### Test 5.2 : Stats imbriquées
**Configuration :** Stat `attributs.force:15`

**Commande :** `/roll dice:1d20+attributs.force`

**Critères de succès :**
- ✅ Notation avec point fonctionne
- ✅ Hiérarchie préservée

---

## Scénario 6 : Statistiques spéciales

### Test 6.1 : Stats à 0
**Configuration :** `intelligence: 0`

**Commande :** `/roll dice:1d20+intelligence`

**Résultat attendu :**
- `1d20+0 = [15]+0 = **15**`
- Pas d'erreur sur valeur nulle

**Critères de succès :**
- ✅ Zéro géré correctement
- ✅ Pas de division par zéro

---

### Test 6.2 : Stats négatives
**Configuration :** `malus: -5`

**Commande :** `/roll dice:1d20+malus`

**Résultat attendu :**
- `1d20-5 = [12]-5 = **7**`
- Signe négatif préservé

**Critères de succès :**
- ✅ Valeurs négatives acceptées
- ✅ Calcul correct

---

### Test 6.3 : Stats textuelles
**Configuration :** `classe: Guerrier` (non numérique)

**Commande :** `/roll dice:1d20+classe`

**Résultat attendu :**
- Erreur : stat non numérique
- Message clair

**Critères de succès :**
- ✅ Type validé
- ✅ Erreur explicite

---

## Scénario 7 : Calculs automatiques

### Test 7.1 : Stat dérivée
**Configuration :**
- `force: 15`
- `bonus_force: =floor((force-10)/2)` (calculé automatiquement)

**Vérification :** bonus_force devrait être 2 (floor((15-10)/2))

**Critères de succès :**
- ✅ Formule évaluée automatiquement
- ✅ Mise à jour si stat source change

---

### Test 7.2 : Stat avec formule complexe
**Configuration :** `initiative: =1d20+dexterite`

**Commande :** `/character show stat:initiative`

**Résultat attendu :**
- Formule affichée, pas évaluée jusqu'à jet
- Lors du jet : dé lancé dynamiquement

**Critères de succès :**
- ✅ Distinction formule/valeur
- ✅ Évaluation à la demande

---

## Scénario 8 : Limites et validations

### Test 8.1 : Stat inexistante
**Commande :** `/roll dice:1d20+inexistante`

**Résultat attendu :**
- Erreur : statistique non trouvée
- Liste des stats disponibles (optionnel)

**Critères de succès :**
- ✅ Détection d'erreur
- ✅ Message utile

---

### Test 8.2 : Nombre maximum de stats
**Action :** Ajouter des stats jusqu'à la limite (ex: 50)

**Critères de succès :**
- ✅ Limite appliquée
- ✅ Message si dépassement
- ✅ Performance acceptable

---

### Test 8.3 : Nom de stat avec caractères spéciaux
**Tester :**
- `force-brute: 10` (tiret)
- `points de vie: 50` (espaces)
- `pv_max: 50` (underscore)

**Critères de succès :**
- ✅ Caractères autorisés documentés
- ✅ Validation à la création

---

## Scénario 9 : Stats et personnages multiples

### Test 9.1 : Comparaison entre personnages
**Actions :**
1. Personnage A : force=15
2. Personnage B : force=12
3. Chacun lance `/roll dice:1d20+force`

**Critères de succès :**
- ✅ Chaque perso utilise sa propre force
- ✅ Pas de confusion entre personnages

---

### Test 9.2 : Import/export de stats
**Actions :**
1. Exporter perso avec stats
2. Importer dans nouveau serveur

**Critères de succès :**
- ✅ Toutes les stats transférées
- ✅ Valeurs préservées
- ✅ Formules/dés intacts

---

## Scénario 10 : Performance et optimisation

### Test 10.1 : Temps de calcul avec nombreuses stats
**Configuration :** 50 stats définies

**Commande :** `/roll dice:1d20+force+dex+con+int+wis`

**Critères de succès :**
- ✅ Temps de réponse < 2s
- ✅ Pas de lag notable

---

### Test 10.2 : Formule récursive (si supportée)
**Configuration :**
- `a: =b`
- `b: =a` (récursion)

**Résultat attendu :**
- Détection de récursion
- Erreur ou limite d'itérations

**Critères de succès :**
- ✅ Pas de boucle infinie
- ✅ Erreur appropriée

---

## Checklist de validation

- [ ] Stats numériques substituées correctement
- [ ] Stats de type dé lancées
- [ ] Modificateurs temporaires/permanents fonctionnels
- [ ] Opérations mathématiques complexes OK
- [ ] Stats dans thresholds fonctionnelles
- [ ] Catégories/groupes gérés
- [ ] Stats à 0 et négatives OK
- [ ] Validation des types
- [ ] Stats dérivées/calculées
- [ ] Erreurs sur stats inexistantes
- [ ] Isolation entre personnages
- [ ] Import/export préserve stats
- [ ] Performance acceptable

---

## Notes de test

```
Date : __________
Testeur : __________
Personnage testé : __________

Stats configurées :
- 
- 

Observations :
- 
- 

Bugs trouvés :
- 
- 

```
