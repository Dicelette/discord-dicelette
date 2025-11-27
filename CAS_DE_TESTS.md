# Cas de tests - Bot Discord Dicelette
## 1. Commandes de lancement de dés

### 1.1 `/roll` - Lancer des dés basiques

#### Test 1.1.1 : Lancer un dé simple
- **Prérequis** : Aucun
- **Commande** : `/roll dé:1d20`
- **Résultat attendu** : 
  - Le bot lance un dé à 20 faces
  - Le résultat est affiché dans le canal ou un thread
  - Le message contient la formule et le résultat

#### Test 1.1.2 : Lancer plusieurs dés
- **Prérequis** : Aucun
- **Commande** : `/roll dé:4d6`
- **Résultat attendu** : 
  - Le bot lance 4 dés à 6 faces
  - Le résultat affiche chaque dé individuel et le total

#### Test 1.1.3 : Lancer des dés avec modificateurs
- **Prérequis** : Aucun
- **Commande** : `/roll dé:1d20+5`
- **Résultat attendu** : 
  - Le bot lance 1d20 et ajoute 5 au résultat
  - Le résultat affiche le dé, le modificateur et le total

#### Test 1.1.4 : Lancer des dés en mode caché
- **Prérequis** : Aucun
- **Commande** : `/roll dé:1d20 éphémère:true`
- **Résultat attendu** : 
  - Le résultat n'est visible que par l'utilisateur qui a lancé la commande
  - Message éphémère

#### Test 1.1.5 : Lancer des dés avec référence à un personnage
- **Prérequis** : Avoir un personnage enregistré nommé "Gandalf"
- **Commande** : `/roll dé:1d20 @Gandalf`
- **Résultat attendu** : 
  - Le lancer est associé au personnage "Gandalf"
  - Le nom du personnage apparaît dans le résultat

#### Test 1.1.6 : Lancer des dés avec des statistiques de personnage
- **Prérequis** : Avoir un personnage avec une statistique "force" = 15
- **Commande** : `/roll dé:$force+1d6`
- **Résultat attendu** : 
  - Le bot remplace $force par la valeur 15
  - Lance 1d6 et ajoute 15
  - Affiche la formule complète et le résultat

### 1.2 `/dbroll` - Lancer avec statistiques enregistrées

#### Test 1.2.1 : Lancer avec statistique simple
- **Prérequis** : Avoir des statistiques enregistrées avec "dextérité"
- **Commande** : `/dbroll statistique:dextérité`
- **Résultat attendu** : 
  - Le bot lance le dé associé à "dextérité"
  - Affiche le nom de la statistique et le résultat

#### Test 1.2.2 : Lancer avec statistique et personnage spécifique
- **Prérequis** : Avoir plusieurs personnages dont "Legolas" avec "précision"
- **Commande** : `/dbroll statistique:précision personnage:Legolas`
- **Résultat attendu** : 
  - Utilise les stats de Legolas
  - Lance le dé de précision
  - Affiche le personnage et le résultat

#### Test 1.2.3 : Lancer en mode caché avec statistiques
- **Prérequis** : Avoir des statistiques enregistrées
- **Commande** : `/dbroll statistique:intelligence éphémère:true`
- **Résultat attendu** : 
  - Résultat visible uniquement par l'utilisateur
  - Utilise la statistique "intelligence"

### 1.3 `/macro` - Lancer une macro enregistrée

#### Test 1.3.1 : Lancer une macro simple
- **Prérequis** : Avoir une macro "attaque_épée" enregistrée
- **Commande** : `/macro nom:attaque_épée`
- **Résultat attendu** : 
  - Le bot lance la macro "attaque_épée"
  - Affiche le nom de la macro et le résultat

#### Test 1.3.2 : Lancer une macro pour un personnage spécifique
- **Prérequis** : Avoir une macro "sort_feu" pour le personnage "Merlin"
- **Commande** : `/macro nom:sort_feu personnage:Merlin`
- **Résultat attendu** : 
  - Utilise la macro de Merlin
  - Affiche le personnage, la macro et le résultat

#### Test 1.3.3 : Lancer une macro globale (template)
- **Prérequis** : Le serveur a une macro globale "initiative"
- **Commande** : `/macro nom:initiative`
- **Résultat attendu** : 
  - Lance la macro globale "initiative"
  - Fonctionne même sans personnage enregistré

### 1.4 `/mj_roll` - Lancers réservés au MJ

#### Test 1.4.1 : MJ lance pour un joueur avec dbroll
- **Prérequis** : Avoir la permission "Gérer les rôles", joueur avec stats
- **Commande** : `/mj_roll dbroll joueur:@Joueur1 statistique:perception`
- **Résultat attendu** : 
  - Lance le dé de perception pour Joueur1
  - Affiche le joueur, la statistique et le résultat

#### Test 1.4.2 : MJ lance une macro pour un joueur
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/mj_roll macro joueur:@Joueur1 nom:attaque_arc`
- **Résultat attendu** : 
  - Lance la macro "attaque_arc" du joueur
  - Affiche qui lance pour qui et le résultat

#### Test 1.4.3 : MJ fait un calcul pour un joueur
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/mj_roll calc joueur:@Joueur1 statistique:force signe:+ formule:1d6`
- **Résultat attendu** : 
  - Calcule force + 1d6 pour Joueur1
  - Affiche le résultat

#### Test 1.4.4 : Utilisateur sans permission tente d'utiliser mj_roll
- **Prérequis** : Ne pas avoir la permission "Gérer les rôles"
- **Commande** : `/mj_roll dbroll joueur:@Joueur1 statistique:force`
- **Résultat attendu** : 
  - Message d'erreur indiquant le manque de permissions
  - La commande n'est pas exécutée

---

## 2. Gestion des personnages

### 2.1 Inscription d'un personnage via bouton "register"

#### Test 2.1.1 : Démarrer l'inscription d'un personnage
- **Prérequis** : Template configuré sur le serveur
- **Action** : Cliquer sur le bouton "S'inscrire" (register)
- **Résultat attendu** : 
  - Un modal ou message s'affiche pour saisir les informations
  - Demande le nom du personnage

#### Test 2.1.2 : Continuer l'inscription (bouton "continue")
- **Prérequis** : Inscription en cours, première page remplie
- **Action** : Cliquer sur le bouton "Continuer" (continue)
- **Résultat attendu** : 
  - Passe à la page suivante du formulaire
  - Demande les statistiques ou macros

#### Test 2.1.3 : Valider l'inscription (bouton "validate")
- **Prérequis** : Toutes les informations remplies
- **Action** : Cliquer sur le bouton "Valider" (validate)
- **Résultat attendu** : 
  - Le personnage est enregistré en base de données
  - Message de confirmation
  - Si auto_role activé, le rôle est attribué

#### Test 2.1.4 : Annuler l'inscription (bouton "cancel")
- **Prérequis** : Inscription en cours
- **Action** : Cliquer sur le bouton "Annuler" (cancel)
- **Résultat attendu** : 
  - L'inscription est annulée
  - Message supprimé ou notification d'annulation

### 2.2 `/display` - Afficher un personnage

#### Test 2.2.1 : Afficher son propre personnage par défaut
- **Prérequis** : Avoir un personnage enregistré
- **Commande** : `/display`
- **Résultat attendu** : 
  - Affiche la fiche du personnage par défaut
  - Contient les statistiques et macros
  - Affiche l'avatar si configuré

#### Test 2.2.2 : Afficher un personnage spécifique
- **Prérequis** : Avoir plusieurs personnages dont "Aragorn"
- **Commande** : `/display personnage:Aragorn`
- **Résultat attendu** : 
  - Affiche la fiche d'Aragorn
  - Contient toutes ses informations

#### Test 2.2.3 : Afficher le personnage d'un autre joueur
- **Prérequis** : Le joueur a un personnage public
- **Commande** : `/display joueur:@Joueur1`
- **Résultat attendu** : 
  - Affiche le personnage du joueur
  - Uniquement si le personnage est public

#### Test 2.2.4 : Afficher un personnage privé (propriétaire)
- **Prérequis** : Avoir un personnage privé
- **Commande** : `/display personnage:MonPersoPrivé`
- **Résultat attendu** : 
  - Affiche le personnage car l'utilisateur en est le propriétaire

#### Test 2.2.5 : Tenter d'afficher un personnage privé (non autorisé)
- **Prérequis** : Un autre joueur a un personnage privé
- **Commande** : `/display joueur:@AutreJoueur personnage:PersoPrivé`
- **Résultat attendu** : 
  - Message d'erreur : "Vous n'avez pas accès à ce personnage"

#### Test 2.2.6 : Afficher avec option persistante
- **Prérequis** : Avoir un personnage
- **Commande** : `/display persistant:true`
- **Résultat attendu** : 
  - Affiche le personnage
  - Le message reste visible (non éphémère)

### 2.3 `/delete_char` - Supprimer un personnage

#### Test 2.3.1 : Supprimer un personnage spécifique
- **Prérequis** : Avoir la permission "Gérer les rôles", joueur a un personnage
- **Commande** : `/delete_char joueur:@Joueur1 personnage:Gimli`
- **Résultat attendu** : 
  - Demande de confirmation
  - Après confirmation, supprime "Gimli"
  - Message de confirmation

#### Test 2.3.2 : Supprimer tous les personnages d'un joueur
- **Prérequis** : Avoir la permission "Gérer les rôles", joueur a plusieurs personnages
- **Commande** : `/delete_char joueur:@Joueur1`
- **Résultat attendu** : 
  - Demande de confirmation avec liste des personnages
  - Supprime tous les personnages du joueur
  - Message de confirmation

#### Test 2.3.3 : Annuler la suppression
- **Prérequis** : Commande de suppression lancée
- **Action** : Cliquer sur "Annuler" dans le message de confirmation
- **Résultat attendu** : 
  - La suppression est annulée
  - Aucun personnage n'est supprimé
  - Message "Suppression annulée"

#### Test 2.3.4 : Confirmer la suppression
- **Prérequis** : Commande de suppression lancée
- **Action** : Cliquer sur "Confirmer" dans le message de confirmation
- **Résultat attendu** : 
  - Les personnages sont supprimés
  - Message de confirmation

---

## 3. Gestion des modèles (Templates)

### 3.1 `/template register` - Enregistrer un modèle

#### Test 3.1.1 : Créer un nouveau template
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/template register channel:#resultats template:[fichier.json]`
- **Résultat attendu** : 
  - Le template est enregistré
  - Le canal de résultats est configuré
  - Message de confirmation

#### Test 3.1.2 : Créer un template avec canal public
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/template register channel:#resultats template:[fichier.json] public:#personnages-publics`
- **Résultat attendu** : 
  - Template enregistré
  - Canal public configuré pour les personnages publics

#### Test 3.1.3 : Créer un template avec canal privé
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/template register channel:#resultats template:[fichier.json] private:#personnages-privés`
- **Résultat attendu** : 
  - Template enregistré
  - Canal privé configuré pour les personnages privés

#### Test 3.1.4 : Mettre à jour un template existant
- **Prérequis** : Template déjà enregistré
- **Commande** : `/template register channel:#resultats template:[nouveau.json] update:true`
- **Résultat attendu** : 
  - Le template existant est mis à jour
  - Les personnages existants peuvent être mis à jour
  - Message de confirmation

#### Test 3.1.5 : Fichier template invalide
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/template register channel:#resultats template:[invalide.txt]`
- **Résultat attendu** : 
  - Message d'erreur indiquant que le fichier n'est pas valide
  - Le template n'est pas enregistré

### 3.2 `/template show` - Afficher le modèle

#### Test 3.2.1 : Afficher le template actuel
- **Prérequis** : Template configuré sur le serveur
- **Commande** : `/template show`
- **Résultat attendu** : 
  - Affiche le template JSON actuel
  - Montre les statistiques et macros disponibles

### 3.3 `/template delete` - Supprimer le modèle

#### Test 3.3.1 : Supprimer le template
- **Prérequis** : Template configuré, permission "Gérer les rôles"
- **Commande** : `/template delete`
- **Résultat attendu** : 
  - Demande de confirmation
  - Après confirmation, supprime le template
  - Message de confirmation

---

## 4. Commandes d'administration

### 4.1 `/config` - Configuration du serveur

#### Test 4.1.1 : Configurer le canal de résultats
- **Prérequis** : Permission "Gérer les rôles"
- **Commande** : `/config result_channel channel:#resultats-des`
- **Résultat attendu** : 
  - Le canal est enregistré
  - Les résultats de dés seront envoyés dans ce canal

#### Test 4.1.2 : Désactiver le canal de résultats
- **Prérequis** : Canal de résultats configuré
- **Commande** : `/config result_channel` (sans spécifier de canal)
- **Résultat attendu** : 
  - Le canal de résultats est désactivé
  - Les résultats restent dans le canal d'origine

#### Test 4.1.3 : Configurer l'auto-attribution de rôle (stats)
- **Prérequis** : Permission "Gérer les rôles"
- **Commande** : `/config auto_role stats rôle:@Joueur`
- **Résultat attendu** : 
  - Le rôle sera automatiquement attribué quand des stats sont validées

#### Test 4.1.4 : Configurer l'auto-attribution de rôle (macros)
- **Prérequis** : Permission "Gérer les rôles"
- **Commande** : `/config auto_role dice rôle:@Lanceur`
- **Résultat attendu** : 
  - Le rôle sera automatiquement attribué quand des macros sont enregistrées

#### Test 4.1.5 : Désactiver l'auto-attribution de rôle
- **Prérequis** : Auto-rôle configuré
- **Commande** : `/config auto_role stats` (sans rôle)
- **Résultat attendu** : 
  - L'auto-attribution est désactivée

#### Test 4.1.6 : Configurer le canal d'administration
- **Prérequis** : Permission "Gérer les rôles"
- **Commande** : `/config admin channel:#logs-admin`
- **Résultat attendu** : 
  - Les modifications de personnages seront loguées dans ce canal

#### Test 4.1.7 : Activer le contexte des dés
- **Prérequis** : Permission "Gérer les rôles"
- **Commande** : `/config contexte true`
- **Résultat attendu** : 
  - Les logs de dés incluront un lien vers le contexte

### 4.2 `/import` - Importer des données

#### Test 4.2.1 : Importer des personnages
- **Prérequis** : Permission "Gérer les rôles", fichier d'export valide
- **Commande** : `/import fichier:[export.json]`
- **Résultat attendu** : 
  - Les personnages sont importés
  - Message de confirmation avec le nombre de personnages importés

### 4.3 `/export` - Exporter des données

#### Test 4.3.1 : Exporter tous les personnages
- **Prérequis** : Permission "Gérer les rôles", des personnages enregistrés
- **Commande** : `/export`
- **Résultat attendu** : 
  - Génère un fichier JSON avec tous les personnages
  - Envoie le fichier en message

---

## 5. Macros et dés enregistrés

### 5.1 Ajouter une macro (bouton "add_dice")

#### Test 5.1.1 : Ajouter une première macro
- **Prérequis** : Personnage affiché avec bouton "Enregistrer une macro"
- **Action** : Cliquer sur le bouton "➕ Enregistrer une macro" (add_dice)
- **Résultat attendu** : 
  - Modal s'affiche pour saisir le nom et la formule de la macro
  - Demande : nom de la macro et formule

#### Test 5.1.2 : Valider l'ajout de macro via modal
- **Prérequis** : Modal d'ajout de macro ouvert
- **Action** : Saisir "attaque_épée" et "1d20+5", valider
- **Résultat attendu** : 
  - La macro est enregistrée
  - Le message du personnage est mis à jour avec la nouvelle macro
  - Message de confirmation

### 5.2 Éditer des macros (bouton "edit_dice")

#### Test 5.2.1 : Ouvrir l'édition des macros
- **Prérequis** : Personnage avec macros existantes
- **Action** : Cliquer sur le bouton "📝 Modifier les macros" (edit_dice)
- **Résultat attendu** : 
  - Modal s'affiche avec les macros actuelles
  - Permet de modifier ou supprimer des macros

#### Test 5.2.2 : Modifier une macro existante
- **Prérequis** : Modal d'édition ouvert
- **Action** : Modifier "attaque_épée:1d20+5" en "attaque_épée:1d20+7"
- **Résultat attendu** : 
  - La macro est mise à jour
  - Le personnage reflète la modification

#### Test 5.2.3 : Supprimer une macro
- **Prérequis** : Modal d'édition ouvert
- **Action** : Supprimer la ligne d'une macro et valider
- **Résultat attendu** : 
  - La macro est supprimée
  - Le personnage n'affiche plus cette macro

### 5.3 `/snippets` - Gérer les snippets utilisateur

#### Test 5.3.1 : Ajouter un snippet
- **Prérequis** : Aucun
- **Commande** : `/snippets add nom:initiative formule:1d20+$dex`
- **Résultat attendu** : 
  - Le snippet "initiative" est enregistré pour l'utilisateur
  - Peut être réutilisé dans les commandes de dés

#### Test 5.3.2 : Lister les snippets
- **Prérequis** : Avoir des snippets enregistrés
- **Commande** : `/snippets list`
- **Résultat attendu** : 
  - Affiche tous les snippets de l'utilisateur
  - Montre le nom et la formule de chaque snippet

#### Test 5.3.3 : Supprimer un snippet
- **Prérequis** : Avoir un snippet "initiative"
- **Commande** : `/snippets delete nom:initiative`
- **Résultat attendu** : 
  - Le snippet "initiative" est supprimé
  - Message de confirmation

---

## 6. Calculs et statistiques

### 6.1 `/calc` - Calculer avec statistiques

#### Test 6.1.1 : Calcul simple avec statistique
- **Prérequis** : Personnage avec "force" = 15
- **Commande** : `/calc statistique:force signe:+ formule:1d6`
- **Résultat attendu** : 
  - Calcule force (15) + 1d6
  - Affiche le résultat détaillé

#### Test 6.1.2 : Calcul avec transformation (arrondi)
- **Prérequis** : Personnage avec "intelligence" = 14
- **Commande** : `/calc statistique:intelligence signe:/ formule:2 transformer:round`
- **Résultat attendu** : 
  - Calcule intelligence / 2 = 7
  - Applique l'arrondi
  - Affiche le résultat

#### Test 6.1.3 : Calcul avec transformation (racine carrée)
- **Prérequis** : Personnage avec "puissance" = 16
- **Commande** : `/calc statistique:puissance transformer:sqrt`
- **Résultat attendu** : 
  - Calcule √16 = 4
  - Affiche le résultat

#### Test 6.1.4 : Calcul avec comparaison
- **Prérequis** : Personnage avec "dextérité" = 12
- **Commande** : `/calc statistique:dextérité signe:>= formule:10`
- **Résultat attendu** : 
  - Vérifie si dextérité >= 10
  - Affiche true/false ou succès/échec

#### Test 6.1.5 : Calcul pour un personnage spécifique
- **Prérequis** : Avoir plusieurs personnages
- **Commande** : `/calc personnage:Merlin statistique:magie signe:+ formule:2d6`
- **Résultat attendu** : 
  - Utilise les stats de Merlin
  - Calcule magie + 2d6

### 6.2 `/graph` - Générer un graphique radar

#### Test 6.2.1 : Générer un graphique basique
- **Prérequis** : Personnage avec plusieurs statistiques
- **Commande** : `/graph`
- **Résultat attendu** : 
  - Génère un graphique radar avec toutes les statistiques
  - Envoie l'image du graphique

#### Test 6.2.2 : Graphique avec couleurs personnalisées
- **Prérequis** : Personnage avec statistiques
- **Commande** : `/graph couleur_ligne:#FF0000 couleur_remplissage:#FF000080`
- **Résultat attendu** : 
  - Génère un graphique avec les couleurs spécifiées
  - Ligne rouge, remplissage rouge transparent

#### Test 6.2.3 : Graphique avec limites min/max
- **Prérequis** : Personnage avec statistiques
- **Commande** : `/graph min:0 max:20`
- **Résultat attendu** : 
  - Graphique avec échelle de 0 à 20
  - Les valeurs sont positionnées correctement

#### Test 6.2.4 : Graphique inversé
- **Prérequis** : Personnage avec statistiques
- **Commande** : `/graph inverser:true`
- **Résultat attendu** : 
  - Les valeurs sont inversées (valeurs hautes deviennent basses)
  - Utile pour des malus ou faiblesses

#### Test 6.2.5 : Graphique pour un autre joueur
- **Prérequis** : Personnage public d'un autre joueur
- **Commande** : `/graph joueur:@Joueur1`
- **Résultat attendu** : 
  - Génère le graphique du personnage du joueur
  - Uniquement si le personnage est public

---

## 7. Affichage et visualisation

### 7.1 Éditer les statistiques (bouton "edit_stats")

#### Test 7.1.1 : Ouvrir l'édition des statistiques
- **Prérequis** : Personnage avec statistiques affichées
- **Action** : Cliquer sur le bouton "📝 Modifier les statistiques" (edit_stats)
- **Résultat attendu** : 
  - Modal s'affiche avec les statistiques actuelles
  - Permet de modifier les valeurs

#### Test 7.1.2 : Modifier une statistique
- **Prérequis** : Modal d'édition ouvert
- **Action** : Changer "force:15" en "force:17", valider
- **Résultat attendu** : 
  - La statistique est mise à jour
  - Le personnage reflète la nouvelle valeur
  - Si modération activée, envoie pour validation

#### Test 7.1.3 : Validation par un modérateur (bouton "validate")
- **Prérequis** : Modification en attente de validation, être modérateur
- **Action** : Cliquer sur "Valider" dans le canal de modération
- **Résultat attendu** : 
  - Les modifications sont appliquées
  - Le joueur est notifié
  - Le message de validation est supprimé

#### Test 7.1.4 : Refus par un modérateur (bouton "refuse")
- **Prérequis** : Modification en attente, être modérateur
- **Action** : Cliquer sur "Refuser" dans le canal de modération
- **Résultat attendu** : 
  - Les modifications sont refusées
  - Le joueur est notifié du refus
  - Les anciennes valeurs sont conservées

### 7.2 `/edit` - Éditer les informations du personnage

#### Test 7.2.1 : Éditer l'avatar via URL
- **Prérequis** : Avoir un personnage
- **Commande** : `/edit edit_avatar url:https://example.com/avatar.png`
- **Résultat attendu** : 
  - L'avatar du personnage est mis à jour
  - La nouvelle image apparaît dans la fiche

#### Test 7.2.2 : Éditer l'avatar via pièce jointe
- **Prérequis** : Avoir un personnage
- **Commande** : `/edit edit_avatar attachment:[image.png]`
- **Résultat attendu** : 
  - L'image est uploadée et définie comme avatar
  - Apparaît dans la fiche du personnage

#### Test 7.2.3 : Éditer l'avatar pour un personnage spécifique
- **Prérequis** : Avoir plusieurs personnages
- **Commande** : `/edit edit_avatar personnage:Gandalf url:https://example.com/gandalf.png`
- **Résultat attendu** : 
  - L'avatar de Gandalf est mis à jour
  - Les autres personnages ne sont pas affectés

#### Test 7.2.4 : Renommer un personnage
- **Prérequis** : Avoir un personnage "test"
- **Commande** : `/edit rename personnage:test nouveau_nom:Aragorn`
- **Résultat attendu** : 
  - Le personnage "test" est renommé en "Aragorn"
  - Toutes les références sont mises à jour

#### Test 7.2.5 : Déplacer un personnage vers un autre utilisateur
- **Prérequis** : Être modérateur, personnage existant
- **Commande** : `/edit move personnage:Legolas joueur:@NouveauJoueur`
- **Résultat attendu** : 
  - Le personnage "Legolas" est transféré au nouveau joueur
  - L'ancien propriétaire n'y a plus accès

### 7.3 Édition via menu déroulant (select "edit_select")

#### Test 7.3.1 : Sélectionner "Renommer"
- **Prérequis** : Menu déroulant d'édition affiché
- **Action** : Sélectionner "📝 Personnage" (name)
- **Résultat attendu** : 
  - Modal s'affiche pour renommer le personnage
  - Demande le nouveau nom

#### Test 7.3.2 : Sélectionner "Avatar"
- **Prérequis** : Menu déroulant d'édition affiché
- **Action** : Sélectionner "🖼 Avatar" (avatar)
- **Résultat attendu** : 
  - Modal s'affiche pour changer l'avatar
  - Demande l'URL ou permet d'uploader

#### Test 7.3.3 : Sélectionner "Utilisateur"
- **Prérequis** : Menu déroulant d'édition affiché, être modérateur
- **Action** : Sélectionner "👤 Joueur" (user)
- **Résultat attendu** : 
  - Modal pour déplacer le personnage vers un autre utilisateur

---

## 8. Interactions avec boutons

### 8.1 Bouton "avatar"

#### Test 8.1.1 : Actualiser l'avatar
- **Prérequis** : Personnage avec avatar affiché
- **Action** : Cliquer sur le bouton "avatar"
- **Résultat attendu** : 
  - Message "Actualisé" en éphémère
  - L'affichage est rafraîchi

### 8.2 Permissions des boutons

#### Test 8.2.1 : Utilisateur non propriétaire tente d'éditer
- **Prérequis** : Fiche d'un autre joueur affichée
- **Action** : Cliquer sur "Modifier les statistiques"
- **Résultat attendu** : 
  - Message d'erreur "Vous n'avez pas la permission"
  - Aucune modification n'est possible

#### Test 8.2.2 : Modérateur édite le personnage d'un autre
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Action** : Cliquer sur "Modifier les statistiques" sur la fiche d'un joueur
- **Résultat attendu** : 
  - Le modal d'édition s'ouvre
  - Les modifications sont possibles

---

## 9. Interactions avec menus déroulants

### 9.1 Menu de sélection pour l'édition

#### Test 9.1.1 : Affichage du menu
- **Prérequis** : Commande d'édition avec menu activée
- **Action** : Observer le menu déroulant
- **Résultat attendu** : 
  - Affiche les options : Personnage, Avatar, Joueur
  - Chaque option a une icône et description

#### Test 9.1.2 : Sélection dans le menu puis réinitialisation
- **Prérequis** : Menu déroulant utilisé
- **Action** : Faire une sélection, valider le modal
- **Résultat attendu** : 
  - L'action sélectionnée est exécutée
  - Les boutons d'édition sont réinitialisés après l'action

---

## 10. Paramètres utilisateur

### 10.1 `/user_settings` - Paramètres de création de liens

#### Test 10.1.1 : Créer un template de lien personnalisé
- **Prérequis** : Aucun
- **Commande** : `/user_settings createlink set final:{{name}} - {{dice}}`
- **Résultat attendu** : 
  - Template personnalisé enregistré
  - Prévisualisation affichée
  - S'applique aux futurs liens copiés

#### Test 10.1.2 : Voir le template de lien actuel
- **Prérequis** : Template personnalisé configuré
- **Commande** : `/user_settings createlink get`
- **Résultat attendu** : 
  - Affiche le template actuel
  - Montre la prévisualisation

#### Test 10.1.3 : Réinitialiser le template de lien
- **Prérequis** : Template personnalisé configuré
- **Commande** : `/user_settings createlink reset`
- **Résultat attendu** : 
  - Le template revient aux valeurs par défaut
  - Message de confirmation

#### Test 10.1.4 : Template de lien au niveau du serveur
- **Prérequis** : Être modérateur
- **Commande** : `/user_settings createlink set final:{{name}}: {{dice}} guild:true`
- **Résultat attendu** : 
  - Template appliqué à tout le serveur
  - Tous les membres utilisent ce template par défaut

### 10.2 `/user_settings set_template` - Définir un template par défaut

#### Test 10.2.1 : Définir un personnage par défaut
- **Prérequis** : Avoir plusieurs personnages
- **Commande** : `/user_settings set_template personnage:Aragorn`
- **Résultat attendu** : 
  - "Aragorn" devient le personnage par défaut
  - Utilisé automatiquement dans les commandes

---

## 11. Menu contextuel

### 11.1 Copier le résultat d'un jet

#### Test 11.1.1 : Copier un résultat de dé
- **Prérequis** : Message de résultat de dé du bot
- **Action** : Clic droit sur le message > Apps > "Copier le résultat du jet"
- **Résultat attendu** : 
  - Message éphémère avec le résultat formaté en code
  - Format selon le template configuré

#### Test 11.1.2 : Tenter de copier un message non-dé
- **Prérequis** : Message quelconque dans le canal
- **Action** : Clic droit > Apps > "Copier le résultat du jet"
- **Résultat attendu** : 
  - Message d'erreur "Ce message n'est pas un résultat de dé"
  - Aucune copie effectuée

#### Test 11.1.3 : Copier un résultat d'un autre bot
- **Prérequis** : Message d'un autre bot
- **Action** : Clic droit > Apps > "Copier le résultat du jet"
- **Résultat attendu** : 
  - Message d'erreur "Ce message ne provient pas du bot Dicelette"

#### Test 11.1.4 : Copier avec template personnalisé
- **Prérequis** : Template de lien personnalisé configuré, résultat de dé
- **Action** : Clic droit > Apps > "Copier le résultat du jet"
- **Résultat attendu** : 
  - Le résultat est formaté selon le template personnalisé
  - Contient tous les éléments définis dans le template

---

## 12. Aide et documentation

### 12.1 `/help` - Commandes d'aide

#### Test 12.1.1 : Aide générale
- **Prérequis** : Aucun
- **Commande** : `/help info`
- **Résultat attendu** : 
  - Affiche les informations générales sur le bot
  - Version, lien vers la documentation

#### Test 12.1.2 : Signaler un bug
- **Prérequis** : Aucun
- **Commande** : `/help bug`
- **Résultat attendu** : 
  - Affiche les instructions pour signaler un bug
  - Lien vers le système de tickets/GitHub

#### Test 12.1.3 : Aide en français
- **Prérequis** : Aucun
- **Commande** : `/help fr`
- **Résultat attendu** : 
  - Affiche la documentation en français
  - Lien vers le README français

#### Test 12.1.4 : Aide pour les administrateurs
- **Prérequis** : Aucun
- **Commande** : `/help admin`
- **Résultat attendu** : 
  - Affiche les commandes réservées aux administrateurs
  - Explications sur la configuration du serveur

#### Test 12.1.5 : Aide sur l'inscription
- **Prérequis** : Aucun
- **Commande** : `/help register`
- **Résultat attendu** : 
  - Explications sur comment créer un personnage
  - Tutoriel d'inscription

#### Test 12.1.6 : Documentation complète
- **Prérequis** : Aucun
- **Commande** : `/help docs`
- **Résultat attendu** : 
  - Lien vers la documentation complète
  - URL vers le site de documentation

#### Test 12.1.7 : Changelog
- **Prérequis** : Aucun
- **Commande** : `/help changelog`
- **Résultat attendu** : 
  - Affiche les dernières modifications du bot
  - Historique des versions

#### Test 12.1.8 : Changelog d'une version spécifique
- **Prérequis** : Aucun
- **Commande** : `/help changelog version:2.0.0`
- **Résultat attendu** : 
  - Affiche le changelog de la version 2.0.0
  - Détails des modifications de cette version

### 12.2 `/choose` - Choisir aléatoirement

#### Test 12.2.1 : Choisir dans une liste
- **Prérequis** : Aucun
- **Commande** : `/choose liste:pomme, orange, banane`
- **Résultat attendu** : 
  - Sélectionne un élément aléatoirement
  - Affiche le résultat

#### Test 12.2.2 : Choisir plusieurs éléments
- **Prérequis** : Aucun
- **Commande** : `/choose liste:rouge, vert, bleu, jaune combien:2`
- **Résultat attendu** : 
  - Sélectionne 2 éléments aléatoirement
  - Affiche les 2 résultats

#### Test 12.2.3 : Choisir avec seed
- **Prérequis** : Aucun
- **Commande** : `/choose liste:a, b, c, d seed:12345`
- **Résultat attendu** : 
  - Sélectionne avec le seed 12345
  - Résultat reproductible avec le même seed

### 12.3 `/new_scene` - Nouvelle scène

#### Test 12.3.1 : Créer une nouvelle scène
- **Prérequis** : Avoir la permission "Gérer les rôles"
- **Commande** : `/new_scene`
- **Résultat attendu** : 
  - Crée un séparateur visuel dans le canal
  - Message indiquant une nouvelle scène

### 12.4 `/math` - Calculatrice

#### Test 12.4.1 : Calcul mathématique simple
- **Prérequis** : Aucun
- **Commande** : `/math expression:2+2*3`
- **Résultat attendu** : 
  - Calcule l'expression : 8
  - Affiche le résultat

#### Test 12.4.2 : Calcul avec fonctions
- **Prérequis** : Aucun
- **Commande** : `/math expression:sqrt(16)`
- **Résultat attendu** : 
  - Calcule la racine carrée de 16 : 4
  - Affiche le résultat

### 12.5 `/karma` - Système de karma

#### Test 12.5.1 : Consulter son karma
- **Prérequis** : Système de karma activé
- **Commande** : `/karma`
- **Résultat attendu** : 
  - Affiche le karma actuel de l'utilisateur

#### Test 12.5.2 : Donner du karma (si implémenté)
- **Prérequis** : Système de karma activé
- **Commande** : `/karma give joueur:@Joueur1`
- **Résultat attendu** : 
  - Donne un point de karma au joueur
  - Message de confirmation

---

## 13. Tests de limites et d'erreurs

### 13.1 Erreurs de permissions

#### Test 13.1.1 : Commande admin sans permission
- **Prérequis** : Ne pas avoir "Gérer les rôles"
- **Commande** : `/template register`
- **Résultat attendu** : 
  - Message d'erreur de permissions
  - La commande n'est pas visible ou ne s'exécute pas

#### Test 13.1.2 : Édition sans être propriétaire ni modérateur
- **Prérequis** : Fiche d'un autre joueur
- **Action** : Cliquer sur "Modifier"
- **Résultat attendu** : 
  - Message "Vous n'avez pas la permission"

### 13.2 Erreurs de données

#### Test 13.2.1 : Lancer un dé sans personnage enregistré
- **Prérequis** : Aucun personnage, template avec stats obligatoires
- **Commande** : `/dbroll statistique:force`
- **Résultat attendu** : 
  - Message d'erreur "Vous devez d'abord enregistrer un personnage"

#### Test 13.2.2 : Accéder à un personnage inexistant
- **Prérequis** : Aucun
- **Commande** : `/display personnage:PersonnageInexistant`
- **Résultat attendu** : 
  - Message d'erreur "Personnage non trouvé"

#### Test 13.2.3 : Macro inexistante
- **Prérequis** : Aucune macro "test"
- **Commande** : `/macro nom:test`
- **Résultat attendu** : 
  - Message d'erreur "Macro non trouvée"

### 13.3 Erreurs de format

#### Test 13.3.1 : Formule de dé invalide
- **Prérequis** : Aucun
- **Commande** : `/roll dé:invalid_dice_formula`
- **Résultat attendu** : 
  - Message d'erreur indiquant que la formule est invalide

#### Test 13.3.2 : Template JSON malformé
- **Prérequis** : Permission admin
- **Commande** : `/template register` avec fichier JSON invalide
- **Résultat attendu** : 
  - Message d'erreur "Fichier JSON invalide"

### 13.4 Tests de concurrence

#### Test 13.4.1 : Éditions simultanées
- **Prérequis** : Deux utilisateurs éditent le même personnage
- **Action** : Les deux cliquent sur "Modifier" en même temps
- **Résultat attendu** : 
  - Les deux modals s'ouvrent
  - La dernière validation écrase la première (comportement à documenter)

---

## 14. Tests de régression

### 14.1 Tests après mise à jour

#### Test 14.1.1 : Personnages existants après mise à jour du template
- **Prérequis** : Personnages enregistrés, mise à jour du template
- **Action** : Afficher un ancien personnage
- **Résultat attendu** : 
  - Le personnage s'affiche correctement
  - Compatibilité avec le nouveau template

---

## 15. Tests de performance

### 15.1 Charge

#### Test 15.1.1 : Nombreux personnages
- **Prérequis** : 100+ personnages sur le serveur
- **Commande** : `/display`
- **Résultat attendu** : 
  - La commande répond en moins de 3 secondes
  - Aucune erreur de timeout

#### Test 15.1.2 : Lancer de dés en masse
- **Prérequis** : Aucun
- **Commande** : `/roll dé:4#d100`
- **Résultat attendu** : 
  - Le bot calcule et affiche le résultat
  - Temps de réponse raisonnable (< 5 secondes)
