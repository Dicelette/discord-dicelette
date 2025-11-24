# Tests E2E - Fiches de Personnage

## Prérequis
- Bot avec permissions de gestion de messages
- Template de personnage configuré (ou test avec template par défaut)
- Droits de modification sur le serveur

---

## Scénario 1 : Création de template

### Test 1.1 : Créer un template simple
**Commande :** `/template create`

**Actions :**
1. Répondre aux modals avec :
   - Nom du template : "Test Template"
   - Statistiques : `force, dexterite, constitution`
   - Dés par défaut : `1d20`

**Résultat attendu :**
- Confirmation de création du template
- Template visible avec `/template list`
- Statistiques correctement enregistrées

**Critères de succès :**
- ✅ Le template est créé
- ✅ Les statistiques sont listées
- ✅ Pas de caractères spéciaux mal interprétés

---

### Test 1.2 : Template avec options avancées
**Prérequis :** Template existant

**Options à tester :**
- Avatar personnalisé
- Dommages multiples
- Compétences personnalisées
- Critiques personnalisés

**Critères de succès :**
- ✅ Chaque option est enregistrée
- ✅ Les options sont récupérables

---

## Scénario 2 : Inscription de personnage

### Test 2.1 : Première inscription
**Commande :** `/register`

**Actions :**
1. Sélectionner le template créé
2. Remplir le modal avec :
   - Nom : "Héros Test"
   - Force : 15
   - Dextérité : 12
   - Constitution : 14

**Résultat attendu :**
- Message de confirmation
- Personnage associé à l'utilisateur
- Statistiques enregistrées correctement

**Critères de succès :**
- ✅ Le personnage est créé
- ✅ Les valeurs sont correctes
- ✅ L'association utilisateur/personnage fonctionne

---

### Test 2.2 : Inscription avec valeurs limites
**Valeurs à tester :**
- Valeurs négatives
- Zéro
- Très grands nombres (999)
- Nombres décimaux

**Critères de succès :**
- ✅ Les validations fonctionnent
- ✅ Messages d'erreur appropriés pour valeurs invalides
- ✅ Les valeurs valides sont acceptées

---

### Test 2.3 : Inscription multiple
**Action :** Tenter `/register` alors qu'un personnage existe déjà

**Résultat attendu :**
- Avertissement : personnage existant
- Option de remplacement ou d'ajout (selon config)

**Critères de succès :**
- ✅ Pas de doublon involontaire
- ✅ Message clair

---

## Scénario 3 : Affichage de fiche

### Test 3.1 : Afficher sa propre fiche
**Commande :** `/show`

**Résultat attendu :**
- Embed avec toutes les statistiques
- Avatar affiché (si configuré)
- Nom du personnage
- Toutes les valeurs présentes

**Critères de succès :**
- ✅ L'embed est bien formaté
- ✅ Toutes les données sont visibles
- ✅ Les couleurs/thème sont appliqués

---

### Test 3.2 : Afficher la fiche d'un autre joueur
**Commande :** `/show user:@AutreJoueur`

**Résultat attendu :**
- Fiche de l'autre joueur affichée
- Permissions respectées (si privé)

**Critères de succès :**
- ✅ La bonne fiche s'affiche
- ✅ Les permissions fonctionnent

---

### Test 3.3 : Afficher fiche inexistante
**Commande :** `/show user:@UtilisateurSansPersonnage`

**Résultat attendu :**
- Message : aucun personnage trouvé

**Critères de succès :**
- ✅ Message d'erreur approprié
- ✅ Pas de crash

---

## Scénario 4 : Modification de statistiques

### Test 4.1 : Modifier une statistique
**Commande :** `/edit stat:force value:18`

**Résultat attendu :**
- Confirmation de modification
- Nouvelle valeur visible avec `/show`

**Critères de succès :**
- ✅ La valeur est mise à jour
- ✅ Seule la stat ciblée change

---

### Test 4.2 : Modifier nom de personnage
**Commande :** `/edit name:"Nouveau Nom"`

**Critères de succès :**
- ✅ Le nom est changé
- ✅ Les statistiques restent intactes

---

### Test 4.3 : Autocomplétion des stats
**Action :** Taper `/edit stat:` et attendre l'autocomplétion

**Résultat attendu :**
- Liste des statistiques disponibles
- Seulement les stats du personnage

**Critères de succès :**
- ✅ L'autocomplétion fonctionne
- ✅ Les suggestions sont pertinentes

---

## Scénario 5 : Suppression

### Test 5.1 : Supprimer son personnage
**Commande :** `/delete`

**Résultat attendu :**
- Demande de confirmation
- Après confirmation : personnage supprimé
- `/show` retourne "pas de personnage"

**Critères de succès :**
- ✅ La suppression fonctionne
- ✅ Confirmation demandée (sécurité)
- ✅ Données complètement effacées

---

### Test 5.2 : Supprimer le personnage d'un autre (admin)
**Commande :** `/delete user:@AutreJoueur`
**Prérequis :** Permissions admin

**Critères de succès :**
- ✅ Seuls les admins peuvent le faire
- ✅ La suppression fonctionne

---

## Scénario 6 : Jets de dés avec statistiques

### Test 6.1 : Jet utilisant une statistique
**Commande :** `/roll dice:1d20+force`

**Résultat attendu :**
- Le bot remplace `force` par la valeur de la stat
- Calcul : `1d20+15 = [12]+15 = **27**`
- Indication de la stat utilisée

**Critères de succès :**
- ✅ La statistique est reconnue
- ✅ La valeur est correctement substituée
- ✅ Le calcul est exact

---

### Test 6.2 : Jet avec stat inexistante
**Commande :** `/roll dice:1d20+intelligence`
(si intelligence n'existe pas sur le personnage)

**Résultat attendu :**
- Erreur : statistique inconnue
- Suggestions de stats disponibles

**Critères de succès :**
- ✅ Message d'erreur clair
- ✅ Pas de crash

---

### Test 6.3 : Jet avec notation entre parenthèses
**Commande :** `/roll dice:Attaque(force)`

**Résultat attendu :**
- Le nom "Attaque" est affiché
- La valeur de force est utilisée

**Critères de succès :**
- ✅ Notation entre parenthèses fonctionnelle
- ✅ Affichage lisible

---

## Scénario 7 : Import/Export

### Test 7.1 : Exporter un personnage (CSV)
**Commande :** `/export`

**Résultat attendu :**
- Fichier CSV téléchargeable
- Contient toutes les données du personnage
- Format valide

**Critères de succès :**
- ✅ Le fichier est généré
- ✅ Les données sont complètes
- ✅ Le CSV est bien formaté

---

### Test 7.2 : Importer un personnage
**Commande :** `/import`
**Fichier :** CSV précédemment exporté

**Résultat attendu :**
- Import réussi
- Toutes les données restaurées
- Personnage fonctionnel

**Critères de succès :**
- ✅ L'import fonctionne
- ✅ Aucune perte de données
- ✅ Validation du format CSV

---

## Scénario 8 : Cas limites multiples personnages

### Test 8.1 : Plusieurs personnages sur un serveur
**Actions :**
1. Utilisateur A crée un personnage
2. Utilisateur B crée un personnage
3. Chacun fait `/show`

**Critères de succès :**
- ✅ Pas de confusion entre personnages
- ✅ Chaque utilisateur voit le sien

---

### Test 8.2 : Même utilisateur sur plusieurs serveurs
**Actions :**
1. Créer personnage sur Serveur 1
2. Créer personnage sur Serveur 2
3. Vérifier que les deux sont indépendants

**Critères de succès :**
- ✅ Les personnages sont distincts
- ✅ Pas de fuite de données entre serveurs

---

## Checklist de validation

- [ ] Template créé et configurable
- [ ] Inscription fonctionne
- [ ] Affichage correct des fiches
- [ ] Modifications enregistrées
- [ ] Suppression sécurisée
- [ ] Jets avec stats fonctionnels
- [ ] Import/Export opérationnels
- [ ] Isolation par serveur et utilisateur
- [ ] Autocomplétion utile
- [ ] Messages d'erreur clairs

---

## Notes de test

```
Date : __________
Testeur : __________
Serveur de test : __________

Observations :
- 
- 

Bugs trouvés :
- 
- 

```
