# Tests E2E - Interactions Multi-utilisateurs

## Prérequis
- Minimum 2-3 utilisateurs Discord de test
- Serveur de test configuré
- Personnages enregistrés pour chaque utilisateur

---

## Scénario 1 : Jets de dés simultanés

### Test 1.1 : Jets indépendants
**Actions :**
1. Utilisateur A : `/roll dice:1d20+force`
2. Utilisateur B : `/roll dice:1d20+dexterite` (immédiatement après)

**Résultat attendu :**
- Deux messages distincts
- Chaque utilisateur utilise ses propres stats
- Pas de confusion des résultats

**Critères de succès :**
- ✅ Isolation des utilisateurs
- ✅ Pas de collision de données
- ✅ Ordre chronologique préservé

---

### Test 1.2 : Jets partagés (shared roll)
**Utilisateur A :** `/roll dice:1d20; 2d6 shared:true`

**Résultat attendu :**
- Message visible par tous
- Utilisateurs B et C peuvent voir les résultats
- Format clair indiquant partage

**Critères de succès :**
- ✅ Partage fonctionnel
- ✅ Visibilité pour tous

---

## Scénario 2 : Oppositions et comparaisons

### Test 2.1 : Opposition simple
**Utilisateur A :** `/roll dice:1d20+force opposition:@UserB`
**Utilisateur B :** Reçoit notification, accepte l'opposition

**Résultat attendu :**
- Les deux jets lancés automatiquement
- Comparaison affichée clairement
- Gagnant indiqué

**Format :**
```
Opposition : @UserA vs @UserB
@UserA : 1d20+15 = **24**
@UserB : 1d20+12 = **19**
🎯 @UserA gagne !
```

**Critères de succès :**
- ✅ Notification reçue
- ✅ Jets synchronisés
- ✅ Résultat clair

---

### Test 2.2 : Opposition refusée
**Actions :**
1. A défie B en opposition
2. B refuse ou ignore (timeout)

**Résultat attendu :**
- Message d'annulation
- A peut relancer avec quelqu'un d'autre

**Critères de succès :**
- ✅ Timeout géré
- ✅ Pas de blocage

---

### Test 2.3 : Opposition multiple (3+ joueurs)
**Configuration :** A, B, C lancent tous 1d20+force

**Commande possible :** `/roll dice:1d20+force group:initiative`

**Résultat attendu :**
- Liste triée par résultat décroissant
- Initiative déterminée

**Critères de succès :**
- ✅ Ordre correct
- ✅ Tous les participants inclus

---

## Scénario 3 : Gestion des personnages partagés

### Test 3.1 : Afficher personnage d'un autre
**Utilisateur A :** `/character show user:@UserB`

**Résultat attendu (si autorisé) :**
- Fiche de personnage de B affichée
- Statistiques visibles (selon paramètres de confidentialité)

**Critères de succès :**
- ✅ Affichage correct
- ✅ Respect de la confidentialité

---

### Test 3.2 : Personnage privé vs public
**Configuration :**
- A : personnage public
- B : personnage privé

**Tests :**
1. C affiche perso de A → OK
2. C affiche perso de B → Refusé ou info limitée

**Critères de succès :**
- ✅ Paramètres de confidentialité respectés

---

## Scénario 4 : Collaboration et partage

### Test 4.1 : Macro partagée
**Utilisateur A (MJ) :** Crée macro serveur `attaque_monstre:1d20+8`

**Utilisateur B :** `/roll dice:$attaque_monstre`

**Résultat attendu :**
- B peut utiliser la macro créée par A
- Formule commune à tous

**Critères de succès :**
- ✅ Partage de macros serveur fonctionnel
- ✅ Attribution/auteur visible (optionnel)

---

### Test 4.2 : Template commun
**MJ :** Crée template "D&D 5e" sur le serveur

**Joueurs :** S'enregistrent avec ce template

**Résultat attendu :**
- Tous utilisent le même format de fiche
- Cohérence dans les stats

**Critères de succès :**
- ✅ Template partagé appliqué uniformément

---

## Scénario 5 : Notifications et mentions

### Test 5.1 : Notification de jet ciblé
**Utilisateur A :** `/roll dice:1d20+force target:@UserB # attaque !`

**Résultat attendu :**
- B reçoit notification Discord (ping)
- Message clairement identifié comme ciblant B

**Critères de succès :**
- ✅ Mention fonctionnelle
- ✅ Notification reçue

---

### Test 5.2 : Résultats visibles/invisibles
**Test 1 :** `/roll dice:1d20 hidden:true` (jet secret MJ)
**Test 2 :** Seul le MJ voit le résultat

**Critères de succès :**
- ✅ Jets secrets fonctionnels
- ✅ Autres joueurs ne voient pas

---

## Scénario 6 : File d'attente et latence

### Test 6.1 : Jets en rafale
**Actions :** 3 utilisateurs lancent `/roll` en même temps (< 1 seconde d'écart)

**Résultat attendu :**
- Tous les jets traités
- Pas de perte de commande
- Ordre préservé

**Critères de succès :**
- ✅ Pas de collision
- ✅ Tous les résultats affichés
- ✅ Temps de réponse acceptable (< 3s chacun)

---

### Test 6.2 : Modification simultanée
**Actions :**
1. A modifie son personnage (force=20)
2. B modifie son personnage (dexterite=15)
3. En même temps

**Résultat attendu :**
- Les deux modifications enregistrées
- Pas de perte de données

**Critères de succès :**
- ✅ Pas de conflit d'écriture
- ✅ Intégrité des données

---

## Scénario 7 : Communication et contexte

### Test 7.1 : Thread de discussion
**Configuration :** Jets dans un thread Discord

**Utilisateur A :** Lance dés dans thread
**Utilisateur B :** Répond dans le même thread

**Résultat attendu :**
- Bot répond dans le thread
- Contexte préservé

**Critères de succès :**
- ✅ Fonctionnement dans threads
- ✅ Contexte isolé

---

### Test 7.2 : Historique des jets
**Commande :** `/history` ou `/rolls recent`

**Résultat attendu :**
- Historique des derniers jets (tous les utilisateurs ou seulement soi)
- Horodatage, auteur, résultat

**Critères de succès :**
- ✅ Historique accessible
- ✅ Filtrage par utilisateur possible

---

## Scénario 8 : Gestion des conflits

### Test 8.1 : Deux joueurs même nom de personnage
**Actions :**
1. A crée personnage "Aragorn"
2. B crée personnage "Aragorn" sur le même serveur

**Résultat attendu :**
- Différenciation automatique (ID utilisateur)
- Pas de confusion lors des jets

**Critères de succès :**
- ✅ Distinction claire
- ✅ Pas de conflit de nommage

---

### Test 8.2 : Modification pendant utilisation
**Actions :**
1. A lance jet avec force=15
2. Pendant le calcul, B (MJ) modifie force de A à 20

**Résultat attendu :**
- Jet utilise la valeur au moment du lancement (15)
- Prochains jets utilisent nouvelle valeur (20)

**Critères de succès :**
- ✅ Atomicité des opérations
- ✅ Pas de valeur corrompue

---

## Scénario 9 : Channels multiples

### Test 9.1 : Commandes dans différents channels
**Actions :**
1. A lance jet dans #jdr-session1
2. B lance jet dans #jdr-session2
3. En même temps

**Résultat attendu :**
- Chaque résultat dans son channel
- Pas de mélange des messages

**Critères de succès :**
- ✅ Isolation par channel
- ✅ Pas de cross-posting accidentel

---

### Test 9.2 : Personnages par serveur
**Configuration :**
- Serveur A : Personnage "Guerrier"
- Serveur B : Personnage "Mage"

**Test :** Même utilisateur, commandes dans chaque serveur

**Résultat attendu :**
- Personnages distincts selon le serveur
- Pas de mélange des données

**Critères de succès :**
- ✅ Isolation par serveur
- ✅ Données séparées

---

## Scénario 10 : Cas extrêmes

### Test 10.1 : Utilisateur quitte le serveur
**Actions :**
1. A a personnage enregistré
2. A quitte le serveur
3. Autres joueurs tentent de voir son perso

**Résultat attendu :**
- Données préservées (optionnel)
- Message "utilisateur non disponible"

**Critères de succès :**
- ✅ Pas de crash
- ✅ Gestion propre du départ

---

### Test 10.2 : Bannissement utilisateur
**Actions :**
1. A est banni du serveur Discord
2. Tentative d'utiliser le bot (si DM possible)

**Résultat attendu :**
- Accès refusé
- Données serveur inaccessibles

**Critères de succès :**
- ✅ Bannissement respecté
- ✅ Sécurité maintenue

---

### Test 10.3 : Bot redémarre pendant interaction
**Actions :**
1. A lance opposition contre B
2. Bot redémarre avant résolution

**Résultat attendu :**
- Message d'erreur propre
- Possibilité de relancer

**Critères de succès :**
- ✅ Pas de données corrompues
- ✅ Reprise gracieuse

---

## Scénario 11 : Groupes et parties

### Test 11.1 : Créer un groupe
**MJ :** `/group create name:"Les Aventuriers" members:@A,@B,@C`

**Résultat attendu :**
- Groupe créé
- Membres notifiés

**Critères de succès :**
- ✅ Groupe fonctionnel
- ✅ Liste des membres

---

### Test 11.2 : Jet de groupe
**Commande :** `/roll dice:1d20+perception group:"Les Aventuriers"`

**Résultat attendu :**
- Tous les membres lancent automatiquement
- Résultats agrégés ou listés

**Critères de succès :**
- ✅ Tous les membres inclus
- ✅ Résultats clairs

---

## Checklist de validation

- [ ] Jets simultanés sans collision
- [ ] Oppositions entre joueurs fonctionnelles
- [ ] Affichage personnages autres joueurs (avec permissions)
- [ ] Macros serveur partagées accessibles
- [ ] Templates communs appliqués uniformément
- [ ] Notifications et mentions opérationnelles
- [ ] Jets secrets/cachés fonctionnels
- [ ] Pas de perte de commandes en rafale
- [ ] Modifications simultanées gérées
- [ ] Fonctionnement dans threads Discord
- [ ] Historique des jets accessible
- [ ] Personnages homonymes distingués
- [ ] Isolation par channel et serveur
- [ ] Gestion départ/bannissement utilisateur
- [ ] Reprise après crash/redémarrage
- [ ] Groupes et jets de groupe OK

---

## Notes de test

```
Date : __________
Testeurs : __________

Participants :
- Utilisateur A : 
- Utilisateur B : 
- Utilisateur C : 

Observations :
- 
- 

Bugs trouvés :
- 
- 

Performance :
- Latence moyenne : 
- Pics de latence : 

```
