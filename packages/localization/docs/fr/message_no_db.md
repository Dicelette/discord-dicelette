Le bot dispose de différentes commandes d'administration qui vous permettent de personnaliser votre expérience.

Vous trouverez [ici](<https://dicelette.github.io/docs/config>) des explications détaillées sur les commandes présentées ici :
- </config display:{{- display}}> : Affiche la configuration du serveur
- </config logs:{{- logs}}> : Enregistre un canal pour afficher les erreurs et les modifications apportées aux enregistrements.
- </config result_channel:{{- result}}> : Permet de définir un canal ou d'activer/désactiver la création automatique d'un thread pour recevoir les résultats de tous les jets de dés du serveur.
- </config delete_after:{{- delete}}> : Permet de modifier le délai avant la suppression des messages de résultats (uniquement si </config result_channel:{{- result}}> est désactivé). Si la valeur est `0`, les messages ne seront pas supprimés. Par défaut, les messages sont supprimés au bout de 3 minutes.
- </config timestamp:{{-timestamp}}> : Affiche (ou non) le timestamp dans les logs des jets de dés.
- </config change_language:{{- language}}> : Permet de changer la langue du bot. La langue par défaut dépend de la langue du serveur, mais est l'anglais si la langue du serveur n'est pas prise en charge ou n'est pas définie.
- </config self_register:{{- self_register}}> : Permet aux utilisateurs d'enregistrer eux-mêmes leurs personnages, avec la possibilité de restreindre la validation uniquement aux modérateurs ainsi que d'empêcher les utilisateurs de créer dans des channels différents de celui par défaut.