# Tests E2E - Permissions et Rôles

## Prérequis
- Serveur Discord de test
- Plusieurs utilisateurs avec rôles différents
- Permissions Discord configurées

---

## Scénario 1 : Permissions de base

### Test 1.1 : Utilisateur sans permission spéciale
**Configuration :** Utilisateur standard (pas d'admin)

**Actions autorisées :**
- `/roll dice:1d20`
- `/character show` (son propre personnage)
- `/macro list` (ses propres macros)

**Actions interdites :**
- `/admin` commands
- Modification personnages d'autres utilisateurs
- Configuration serveur

**Critères de succès :**
- ✅ Actions autorisées fonctionnent
- ✅ Actions interdites : message d'erreur approprié
- ✅ Pas de bypass de permissions

---

### Test 1.2 : Administrateur serveur
**Configuration :** Utilisateur avec rôle Administrateur Discord

**Actions autorisées :**
- Toutes commandes utilisateur standard
- `/admin config`
- Gestion templates globaux
- Modération (si applicable)

**Critères de succès :**
- ✅ Accès complet aux commandes admin
- ✅ Pas de restrictions abusives

---

## Scénario 2 : Rôles personnalisés

### Test 2.1 : Rôle "Maître du Jeu" (MJ)
**Configuration :** Créer rôle "MJ" avec permissions spéciales

**Permissions spéciales :**
- Voir/éditer personnages de tous les joueurs
- Créer templates serveur
- Gérer macros globales

**Tests :**
1. `/character show user:@joueur` (voir perso d'un autre)
2. `/template create` (template serveur)
3. `/macro add name:global formula:1d20 scope:server`

**Critères de succès :**
- ✅ Rôle MJ reconnu
- ✅ Permissions étendues appliquées
- ✅ Distinction MJ/joueur claire

---

### Test 2.2 : Hiérarchie des rôles
**Configuration :**
- Rôle A : permissions de base
- Rôle B : permissions étendues (hérite de A)

**Test :** Utilisateur avec Rôle B accède aux permissions A + B

**Critères de succès :**
- ✅ Héritage des permissions fonctionnel
- ✅ Pas de conflits

---

## Scénario 3 : Gestion des personnages

### Test 3.1 : Créer son propre personnage
**Utilisateur :** Standard

**Commande :** `/character register`

**Critères de succès :**
- ✅ Création autorisée
- ✅ Personnage assigné à l'utilisateur correct

---

### Test 3.2 : Éditer personnage d'un autre utilisateur
**Utilisateur A :** Standard
**Utilisateur B :** Standard

**Action :** A tente `/character modify user:@B stat:force value:20`

**Résultat attendu :**
- Erreur : permission refusée
- Seul B ou un MJ peut modifier le perso de B

**Critères de succès :**
- ✅ Protection des données personnages
- ✅ Message d'erreur explicite

---

### Test 3.3 : MJ modifie personnage d'un joueur
**Utilisateur MJ :** Avec rôle MJ
**Utilisateur Joueur :** Standard

**Commande MJ :** `/character modify user:@Joueur stat:pv value:-10`

**Résultat attendu :**
- Modification réussie
- Notification au joueur (optionnel)
- Log de la modification (optionnel)

**Critères de succès :**
- ✅ MJ peut modifier les personnages
- ✅ Transparence/traçabilité

---

## Scénario 4 : Templates et macros

### Test 4.1 : Créer macro personnelle
**Utilisateur :** Standard

**Commande :** `/macro add name:test formula:1d20`

**Critères de succès :**
- ✅ Création autorisée
- ✅ Macro privée (seulement visible par l'utilisateur)

---

### Test 4.2 : Créer macro serveur
**Utilisateur Standard :** `/macro add name:global formula:1d20 scope:server`

**Résultat attendu :**
- Erreur : permission insuffisante

**Utilisateur Admin/MJ :**
- Macro créée avec succès
- Accessible à tous les utilisateurs du serveur

**Critères de succès :**
- ✅ Macros serveur restreintes
- ✅ Distinction macro perso/serveur

---

### Test 4.3 : Supprimer macro serveur
**Action :** Utilisateur standard tente de supprimer une macro serveur

**Résultat attendu :**
- Erreur : seul un admin/MJ peut supprimer

**Critères de succès :**
- ✅ Protection des macros globales

---

## Scénario 5 : Channels et restrictions

### Test 5.1 : Commandes dans mauvais channel
**Configuration :** Limiter `/roll` à #jeux-de-roles uniquement

**Action :** Lancer `/roll dice:1d20` dans #général

**Résultat attendu :**
- Erreur : commande non disponible ici
- Indication du channel correct

**Critères de succès :**
- ✅ Restriction par channel fonctionnelle
- ✅ Message d'aide utile

---

### Test 5.2 : Channel privé vs public
**Test 1 :** Commande dans channel public accessible
**Test 2 :** Commande dans DM privé avec le bot

**Critères de succès :**
- ✅ Commandes fonctionnent dans contextes autorisés
- ✅ Restrictions respectées

---

## Scénario 6 : Modération

### Test 6.1 : Bloquer un utilisateur
**Admin :** `/admin block user:@spammer`

**Résultat attendu :**
- Utilisateur bloqué ne peut plus utiliser le bot
- Tentative : erreur "accès refusé"

**Critères de succès :**
- ✅ Blocage effectif
- ✅ Commandes refusées

---

### Test 6.2 : Débloquer un utilisateur
**Admin :** `/admin unblock user:@spammer`

**Résultat attendu :**
- Utilisateur peut à nouveau utiliser le bot

**Critères de succès :**
- ✅ Déblocage fonctionnel
- ✅ Restauration des permissions

---

### Test 6.3 : Liste des utilisateurs bloqués
**Admin :** `/admin blocked_users`

**Résultat attendu :**
- Liste de tous les utilisateurs bloqués
- Date de blocage (optionnel)

**Critères de succès :**
- ✅ Liste accessible
- ✅ Informations complètes

---

## Scénario 7 : Configuration serveur

### Test 7.1 : Modifier paramètres serveur (admin)
**Admin :** `/admin config set default_dice_color:green`

**Critères de succès :**
- ✅ Paramètre modifié
- ✅ Effet immédiat ou après reload

---

### Test 7.2 : Tenter config en tant qu'utilisateur standard
**Utilisateur :** `/admin config set ...`

**Résultat attendu :**
- Erreur : permission refusée

**Critères de succès :**
- ✅ Configuration protégée

---

## Scénario 8 : Permissions Discord natives

### Test 8.1 : Intégration avec permissions Discord
**Configuration :** Commande nécessite "Gérer les messages"

**Test 1 :** Utilisateur avec permission Discord → autorisé
**Test 2 :** Utilisateur sans permission → refusé

**Critères de succès :**
- ✅ Permissions Discord respectées
- ✅ Pas de contournement

---

### Test 8.2 : Propriétaire du serveur
**Test :** Propriétaire du serveur Discord

**Résultat attendu :**
- Accès à toutes les commandes bot
- Bypass des restrictions (sauf blocages explicites)

**Critères de succès :**
- ✅ Propriétaire = super admin
- ✅ Pas de restrictions abusives

---

## Scénario 9 : Cas limites

### Test 9.1 : Utilisateur sans rôle
**Configuration :** Utilisateur rejoint serveur, aucun rôle assigné

**Résultat attendu :**
- Accès aux commandes de base (roll, character)
- Pas d'accès admin

**Critères de succès :**
- ✅ Permissions par défaut appliquées
- ✅ Utilisabilité préservée

---

### Test 9.2 : Permissions conflictuelles
**Configuration :** Utilisateur a Rôle A (autorise X) et Rôle B (interdit X)

**Résultat attendu :**
- Règle de priorité claire (ex: interdiction prioritaire)
- Comportement cohérent

**Critères de succès :**
- ✅ Conflit résolu logiquement
- ✅ Pas de bugs

---

### Test 9.3 : Changement de rôle en temps réel
**Actions :**
1. Utilisateur a rôle Standard
2. Admin lui donne rôle MJ
3. Utilisateur utilise commande MJ immédiatement

**Résultat attendu :**
- Permissions mises à jour immédiatement
- Pas besoin de reconnexion

**Critères de succès :**
- ✅ Mise à jour en temps réel
- ✅ Pas de cache obsolète

---

## Scénario 10 : Audit et logs

### Test 10.1 : Journal des actions admin
**Actions :**
- Admin modifie config
- Admin bloque utilisateur
- Admin crée macro serveur

**Vérification :** `/admin logs`

**Résultat attendu :**
- Toutes les actions admin loggées
- Horodatage, auteur, action

**Critères de succès :**
- ✅ Logs complets
- ✅ Traçabilité assurée

---

### Test 10.2 : Permissions d'accès aux logs
**Utilisateur Standard :** Tente `/admin logs`

**Résultat attendu :**
- Erreur : accès refusé

**Critères de succès :**
- ✅ Logs protégés
- ✅ Seuls admins peuvent consulter

---

## Checklist de validation

- [ ] Permissions de base respectées (user/admin)
- [ ] Rôles personnalisés fonctionnels
- [ ] Protection des personnages d'autres utilisateurs
- [ ] MJ peut gérer tous les personnages
- [ ] Macros/templates serveur restreints
- [ ] Restrictions par channel effectives
- [ ] Blocage/déblocage d'utilisateurs OK
- [ ] Configuration serveur protégée
- [ ] Permissions Discord natives intégrées
- [ ] Propriétaire = super admin
- [ ] Conflits de permissions gérés
- [ ] Mise à jour des permissions en temps réel
- [ ] Logs d'audit complets

---

## Notes de test

```
Date : __________
Testeur : __________
Serveur de test : __________

Rôles configurés :
- 
- 

Observations :
- 
- 

Bugs trouvés :
- 
- 

```
